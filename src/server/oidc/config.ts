import { z } from 'zod'

export class OidcError extends Error {
  constructor(
    readonly code: string,
    readonly status = 503
  ) {
    super(code)
    this.name = 'OidcError'
  }
}

export function isOidcMode(): boolean {
  return process.env.WEB_AUTH_MODE === 'oidc'
}

const configSchema = z
  .object({
    issuer: z.url(),
    clientId: z.string().min(1),
    clientSecret: z.string().min(1).optional(),
    origin: z.url(),
    gateway: z.url(),
    redis: z.string().regex(/^rediss?:\/\//),
    encryptionKey: z.string().regex(/^[a-fA-F0-9]{64}$/),
    allowLocalHttp: z.boolean(),
  })
  .readonly()

export function oidcConfig() {
  const result = configSchema.safeParse({
    issuer: process.env.OIDC_ISSUER,
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    origin: process.env.WEB_ORIGIN,
    gateway: process.env.ANALYSIS_GATEWAY_URL,
    redis: process.env.WEB_SESSION_REDIS_URL,
    encryptionKey: process.env.WEB_SESSION_ENCRYPTION_KEY,
    allowLocalHttp: process.env.OIDC_ALLOW_LOCAL_HTTP === 'true',
  })
  if (!result.success) throw new OidcError('AUTH_CONFIGURATION_INVALID')
  const config = result.data
  for (const value of [config.issuer, config.origin]) {
    const url = new URL(value)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== 'https:' &&
        !(config.allowLocalHttp && local && url.protocol === 'http:'))
    ) {
      throw new OidcError('AUTH_URL_INVALID')
    }
  }
  if (new URL(config.origin).pathname !== '/')
    throw new OidcError('AUTH_ORIGIN_INVALID')
  const gateway = new URL(config.gateway)
  if (
    !['http:', 'https:'].includes(gateway.protocol) ||
    gateway.username ||
    gateway.password ||
    gateway.pathname !== '/' ||
    gateway.search ||
    gateway.hash
  )
    throw new OidcError('GATEWAY_URL_INVALID')
  return config
}

export function safeOidcNext(value: string | null): string {
  if (
    !value ||
    /[\\\u0000-\u0020]/.test(value) ||
    !value.startsWith('/') ||
    value.startsWith('//')
  )
    return '/trends-jobs'
  const url = new URL(value, 'https://local.invalid')
  return url.origin === 'https://local.invalid' &&
    url.pathname === '/trends-jobs'
    ? `${url.pathname}${url.search}`
    : '/trends-jobs'
}

export function authCookieName(): string {
  return new URL(oidcConfig().origin).protocol === 'https:'
    ? '__Host-stock-insight-session'
    : 'stock-insight-session'
}

export function loginCookieName(): string {
  return new URL(oidcConfig().origin).protocol === 'https:'
    ? '__Host-stock-insight-login'
    : 'stock-insight-login'
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: new URL(oidcConfig().origin).protocol === 'https:',
    sameSite: 'lax',
    path: '/',
  } as const
}
