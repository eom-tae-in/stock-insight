import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    exchangeCodeForSession: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

describe('auth callback API route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to the safe next path after exchanging code', async () => {
    supabaseMock.auth.exchangeCodeForSession.mockResolvedValue({ error: null })

    const response = await GET(
      new NextRequest('http://localhost/api/auth/callback?code=abc&next=/admin')
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/admin')
    expect(supabaseMock.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc')
  })

  it.each([
    {
      name: 'missing next',
      url: 'http://localhost/api/auth/callback?code=abc',
      expectedNext: '/',
    },
    {
      name: 'external next',
      url: 'http://localhost/api/auth/callback?code=abc&next=https://evil.test',
      expectedNext: '/',
    },
    {
      name: 'protocol-relative next',
      url: 'http://localhost/api/auth/callback?code=abc&next=//evil.test',
      expectedNext: '/',
    },
  ])('normalizes $name to root', async ({ url, expectedNext }) => {
    supabaseMock.auth.exchangeCodeForSession.mockResolvedValue({ error: null })

    const response = await GET(new NextRequest(url))

    expect(response.headers.get('location')).toBe(
      `http://localhost${expectedNext}`
    )
  })

  it('redirects to login when code exchange fails', async () => {
    supabaseMock.auth.exchangeCodeForSession.mockResolvedValue({
      error: new Error('bad code'),
    })

    const response = await GET(
      new NextRequest('http://localhost/api/auth/callback?code=bad&next=/admin')
    )

    expect(response.headers.get('location')).toBe(
      'http://localhost/login?error=auth_error&next=%2Fadmin'
    )
  })

  it('redirects to login when code is missing', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/auth/callback?next=/admin')
    )

    expect(response.headers.get('location')).toBe(
      'http://localhost/login?error=auth_error&next=%2Fadmin'
    )
    expect(supabaseMock.auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })
})
