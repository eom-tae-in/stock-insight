import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { createClient } from 'redis'
import { z } from 'zod'
import { oidcConfig, OidcError } from './config'

export interface AuthStore {
  read(key: string): Promise<string | null>
  take(key: string): Promise<string | null>
  put(key: string, value: string, ttl: number): Promise<void>
  remove(key: string): Promise<void>
  lock(key: string, ticket: string): Promise<boolean>
  finish(
    key: string,
    ticket: string,
    value: string,
    ttl: number
  ): Promise<boolean>
  unlock(key: string, ticket: string): Promise<void>
}

let connection: Promise<AuthStore> | undefined

export function authStore(): Promise<AuthStore> {
  if (!connection) {
    connection = connectStore().catch((error: unknown) => {
      connection = undefined
      throw error
    })
  }
  return connection
}

async function connectStore(): Promise<AuthStore> {
  const client = createClient({
    url: oidcConfig().redis,
    socket: { connectTimeout: 3000, reconnectStrategy: false },
    disableOfflineQueue: true,
  })
  client.on('error', () => {
    connection = undefined
    console.error('OIDC session store connection failed')
  })
  await client.connect()
  const commands = client.withCommandOptions({ timeout: 3000 })
  const name = (key: string) => `stock-insight:auth:${key}`
  return {
    read: key => commands.get(name(key)),
    take: key => commands.getDel(name(key)),
    async put(key, value, ttl) {
      await commands.set(name(key), value, { EX: ttl })
    },
    async remove(key) {
      await commands.del(name(key))
    },
    async lock(key, ticket) {
      return (
        (await commands.set(`${name(key)}:lock`, ticket, {
          NX: true,
          PX: 30000,
        })) === 'OK'
      )
    },
    async finish(key, ticket, value, ttl) {
      const result = await commands.eval(
        `
        if redis.call('GET', KEYS[2]) ~= ARGV[1] or redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
        redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
        return 1
      `,
        {
          keys: [name(key), `${name(key)}:lock`],
          arguments: [ticket, value, String(ttl)],
        }
      )
      return z.number().parse(result) === 1
    },
    async unlock(key, ticket) {
      await commands.eval(
        `
        if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
        return 0
      `,
        { keys: [`${name(key)}:lock`], arguments: [ticket] }
      )
    },
  }
}

export function seal(value: unknown): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(
    'aes-256-gcm',
    Buffer.from(oidcConfig().encryptionKey, 'hex'),
    iv
  )
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ])
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    'base64url'
  )
}

export function unseal<T>(value: string, schema: z.ZodType<T>): T {
  const bytes = Buffer.from(value, 'base64url')
  if (bytes.length < 29) throw new OidcError('SESSION_INVALID', 401)
  const decipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(oidcConfig().encryptionKey, 'hex'),
    bytes.subarray(0, 12)
  )
  decipher.setAuthTag(bytes.subarray(12, 28))
  const plaintext = Buffer.concat([
    decipher.update(bytes.subarray(28)),
    decipher.final(),
  ]).toString('utf8')
  const parsed: unknown = JSON.parse(plaintext)
  return schema.parse(parsed)
}
