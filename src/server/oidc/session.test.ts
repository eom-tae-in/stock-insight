// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest'
import ky from 'ky'
import { randomBytes } from 'node:crypto'
import { startOidcProvider, stop } from '../../../tests/fixtures/oidc-provider'
import { startRedisFixture } from '../../../tests/fixtures/redis-server'
import { authorizationUrl, exchangeCode, type LoginFlow } from './provider'
import { authStore, seal, unseal } from './store'
import {
  createSession,
  deleteSession,
  readSession,
  sessionSchema,
  checkCsrf,
} from './session'
import { safeOidcNext, oidcConfig } from './config'

describe('OIDC protocol and Redis session', () => {
  let provider: Awaited<ReturnType<typeof startOidcProvider>>
  let redis: Awaited<ReturnType<typeof startRedisFixture>>
  beforeAll(async () => {
    provider = await startOidcProvider()
    redis = await startRedisFixture()
    vi.stubEnv('OIDC_ISSUER', provider.issuer)
    vi.stubEnv('OIDC_CLIENT_ID', 'stock-insight-web')
    vi.stubEnv('OIDC_ALLOW_LOCAL_HTTP', 'true')
    vi.stubEnv('WEB_ORIGIN', 'http://localhost:3000')
    vi.stubEnv('ANALYSIS_GATEWAY_URL', 'http://localhost:8080')
    vi.stubEnv('WEB_SESSION_REDIS_URL', redis.url)
    vi.stubEnv('WEB_SESSION_ENCRYPTION_KEY', randomBytes(32).toString('hex'))
  })
  afterAll(async () => {
    await stop(provider.server)
    await redis.close()
    vi.unstubAllEnvs()
  })

  async function login() {
    const flow: LoginFlow = {
      state: 'fixture-state',
      nonce: 'fixture-nonce',
      verifier: 'a'.repeat(43),
      next: '/trends-jobs',
    }
    const response = await ky(await authorizationUrl(flow), {
      redirect: 'manual',
      throwHttpErrors: false,
    })
    const location = response.headers.get('location')
    if (!location) throw new Error('Fixture callback missing')
    return { flow, url: new URL(location) }
  }

  it('exchanges a PKCE code and stores tokens encrypted outside the browser', async () => {
    const { flow, url } = await login()
    const tokens = await exchangeCode(url, flow)
    const created = await createSession(tokens)
    const raw = await (await authStore()).read(`session:${created.id}`)
    expect(raw).not.toContain('fixture-access')
    expect((await readSession(created.id))?.subject).toBe('fixture-user')
  })

  it('rejects an ID token whose nonce does not match', async () => {
    provider.setWrongNonce(true)
    const { flow, url } = await login()
    await expect(exchangeCode(url, flow)).rejects.toThrow()
    provider.setWrongNonce(false)
  })

  it('rejects a forged ID token signature', async () => {
    provider.setInvalidSignature(true)
    try {
      const { flow, url } = await login()
      await expect(exchangeCode(url, flow)).rejects.toThrow()
    } finally {
      provider.setInvalidSignature(false)
    }
  })

  it('rejects a callback with a different state', async () => {
    const { flow, url } = await login()
    await expect(
      exchangeCode(url, { ...flow, state: 'other-state' })
    ).rejects.toThrow()
  })

  it('rejects a code with an incorrect PKCE verifier', async () => {
    const { flow, url } = await login()
    await expect(
      exchangeCode(url, { ...flow, verifier: 'b'.repeat(43) })
    ).rejects.toThrow()
  })

  it('deletes a session when its refresh grant was revoked', async () => {
    const { flow, url } = await login()
    const created = await createSession(await exchangeCode(url, flow))
    const database = await authStore()
    await database.put(
      `session:${created.id}`,
      seal({ ...created.session, accessExpiresAt: 0, refreshToken: 'revoked' }),
      300
    )
    expect(await readSession(created.id)).toBeNull()
    expect(await database.read(`session:${created.id}`)).toBeNull()
  })

  it('enforces the absolute session deadline', async () => {
    const { flow, url } = await login()
    const created = await createSession(await exchangeCode(url, flow))
    const database = await authStore()
    await database.put(
      `session:${created.id}`,
      seal({ ...created.session, expiresAt: 0 }),
      300
    )
    expect(await readSession(created.id)).toBeNull()
    expect(await database.read(`session:${created.id}`)).toBeNull()
  })

  it('refreshes once when concurrent requests use the same expired access token', async () => {
    const { flow, url } = await login()
    const created = await createSession(await exchangeCode(url, flow))
    const database = await authStore()
    await database.put(
      `session:${created.id}`,
      seal({ ...created.session, accessExpiresAt: 0 }),
      300
    )
    const before = provider.refreshCount()
    const sessions = await Promise.all([
      readSession(created.id),
      readSession(created.id),
    ])
    expect(
      sessions.every(
        session =>
          session?.accessExpiresAt && session.accessExpiresAt > Date.now()
      )
    ).toBe(true)
    expect(provider.refreshCount() - before).toBe(1)
  })

  it('cannot resurrect a logged-out session through a delayed refresh', async () => {
    const { flow, url } = await login()
    const created = await createSession(await exchangeCode(url, flow))
    const database = await authStore()
    await database.lock(`session:${created.id}`, 'ticket')
    await deleteSession(created.id)
    expect(
      await database.finish(
        `session:${created.id}`,
        'ticket',
        seal(created.session),
        300
      )
    ).toBe(false)
    expect(await readSession(created.id)).toBeNull()
    await database.unlock(`session:${created.id}`, 'ticket')
  })

  it('consumes an authorization transaction only once', async () => {
    const database = await authStore()
    await database.put('flow:one-time', seal({ state: 'unique' }), 60)
    expect(await database.take('flow:one-time')).not.toBeNull()
    expect(await database.take('flow:one-time')).toBeNull()
  })

  it('rejects ciphertext tampering', async () => {
    const { flow, url } = await login()
    const created = await createSession(await exchangeCode(url, flow))
    const ciphertext = Buffer.from(seal(created.session), 'base64url')
    ciphertext[15] = (ciphertext[15] ?? 0) ^ 1
    expect(() =>
      unseal(ciphertext.toString('base64url'), sessionSchema)
    ).toThrow()
  })

  it('rejects cross-origin and missing-CSRF mutations', async () => {
    const { flow, url } = await login()
    const created = await createSession(await exchangeCode(url, flow))
    expect(() =>
      checkCsrf('https://other.example', created.session.csrf, created.session)
    ).toThrow()
    expect(() =>
      checkCsrf('http://localhost:3000', null, created.session)
    ).toThrow()
    expect(() =>
      checkCsrf('http://localhost:3000', created.session.csrf, created.session)
    ).not.toThrow()
  })

  it.each([
    '//other.example',
    '/\\other.example',
    '/trends-jobs\n',
    '/stock-analysis',
  ])('rejects unsafe or unported next destination %s', input => {
    expect(safeOidcNext(input)).toBe('/trends-jobs')
  })

  it('does not allow insecure non-local issuer URLs', () => {
    vi.stubEnv('OIDC_ISSUER', 'http://public.example/realm')
    expect(() => oidcConfig()).toThrow()
    vi.stubEnv('OIDC_ISSUER', provider.issuer)
  })
})
