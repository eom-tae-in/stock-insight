import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'

const auth = vi.hoisted(() => ({ getUser: vi.fn(), readSession: vi.fn() }))
vi.mock('@/lib/supabase/middleware-client', () => ({
  createSupabaseMiddlewareClient: () => ({ auth }),
}))
vi.mock('@/server/oidc/session', () => ({ readSession: auth.readSession }))
vi.mock('@/server/oidc/config', () => ({
  isOidcMode: () => process.env.WEB_AUTH_MODE === 'oidc',
  authCookieName: () => 'session',
  oidcConfig: () => ({ origin: 'https://example.test' }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  auth.getUser.mockResolvedValue({ data: { user: null } })
  auth.readSession.mockResolvedValue(null)
})
afterEach(() => vi.unstubAllEnvs())

describe.each(['legacy', 'oidc'])('public guides in %s mode', mode => {
  beforeEach(() => vi.stubEnv('WEB_AUTH_MODE', mode))
  it.each(['/explore', '/guide?step=5', '/renewal?step=6'])(
    'serves %s without consulting an auth provider',
    async path => {
      const response = await middleware(
        new NextRequest(`https://example.test${path}`)
      )
      expect(response.headers.get('x-middleware-next')).toBe('1')
      expect(auth.getUser).not.toHaveBeenCalled()
      expect(auth.readSession).not.toHaveBeenCalled()
    }
  )
  it.each([
    '/guide/private',
    '/renewal-data',
    '/explore/account',
    '/stock-analysis',
  ])('keeps %s protected', async path => {
    const response = await middleware(
      new NextRequest(`https://example.test${path}`)
    )
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe(
      '/login'
    )
  })
  it('keeps job APIs protected', async () => {
    const response = await middleware(
      new NextRequest('https://example.test/api/trends-jobs')
    )
    expect(response.status).toBe(401)
  })
})
