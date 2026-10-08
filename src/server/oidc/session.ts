import { randomBytes, timingSafeEqual } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { z } from 'zod'
import { authStore, seal, unseal, type AuthStore } from './store'
import { refreshTokens, tokenSchema, type AuthTokens } from './provider'
import { OidcError, oidcConfig } from './config'

export const sessionSchema = tokenSchema
  .unwrap()
  .extend({
    csrf: z.string(),
    expiresAt: z.number(),
  })
  .readonly()
export type WebSession = z.infer<typeof sessionSchema>
export const sessionIdSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/)
export const randomSecret = () => randomBytes(32).toString('base64url')

export async function createSession(
  tokens: AuthTokens
): Promise<{ readonly id: string; readonly session: WebSession }> {
  const id = randomSecret()
  const session = sessionSchema.parse({
    ...tokens,
    csrf: randomSecret(),
    expiresAt: Date.now() + 28800000,
  })
  await (await authStore()).put(`session:${id}`, seal(session), 28800)
  return { id, session }
}

export async function readSession(
  id: string | undefined,
  store?: AuthStore
): Promise<WebSession | null> {
  if (!sessionIdSchema.safeParse(id).success || !id) return null
  const database = store ?? (await authStore())
  const key = `session:${id}`
  const raw = await database.read(key)
  if (!raw) return null
  const session = unseal(raw, sessionSchema)
  if (session.expiresAt <= Date.now()) {
    await database.remove(key)
    return null
  }
  if (session.accessExpiresAt > Date.now() + 30000) return session
  const ticket = randomSecret()
  if (!(await database.lock(key, ticket))) {
    for (let attempt = 0; attempt < 20; attempt++) {
      await delay(100)
      const current = await database.read(key)
      if (!current) return null
      const updated = unseal(current, sessionSchema)
      if (updated.accessExpiresAt > Date.now() + 30000) return updated
    }
    throw new OidcError('SESSION_REFRESH_BUSY')
  }
  try {
    const current = await database.read(key)
    if (!current) return null
    const latest = unseal(current, sessionSchema)
    if (latest.accessExpiresAt > Date.now() + 30000) return latest
    const tokens = await refreshTokens(latest)
    if (!tokens) {
      await database.remove(key)
      return null
    }
    const renewed = sessionSchema.parse({ ...latest, ...tokens })
    const ttl = Math.floor((renewed.expiresAt - Date.now()) / 1000)
    if (ttl <= 0) {
      await database.remove(key)
      return null
    }
    return (await database.finish(key, ticket, seal(renewed), ttl))
      ? renewed
      : null
  } finally {
    await database.unlock(key, ticket)
  }
}

export async function deleteSession(id: string): Promise<void> {
  if (sessionIdSchema.safeParse(id).success)
    await (await authStore()).remove(`session:${id}`)
}

export function checkCsrf(
  origin: string | null,
  token: string | null,
  session: WebSession
): void {
  if (
    origin !== new URL(oidcConfig().origin).origin ||
    !token ||
    Buffer.byteLength(token) !== Buffer.byteLength(session.csrf) ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(session.csrf))
  )
    throw new OidcError('CSRF_REJECTED', 403)
}
