import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OAuthLoginButton } from './login-button'

const authMock = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
}))

vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: authMock,
  }),
}))

describe('OAuthLoginButton', () => {
  beforeEach(() => {
    authMock.signInWithOAuth.mockReset()
    authMock.signInWithOAuth.mockResolvedValue({})
  })

  it.each([
    { nextPath: '/stock-analysis', expectedNext: '/stock-analysis' },
    { nextPath: '//evil.example', expectedNext: null },
    { nextPath: 'https://evil.example', expectedNext: null },
    { nextPath: undefined, expectedNext: null },
  ])(
    'starts OAuth login with a safe callback URL',
    async ({ nextPath, expectedNext }) => {
      const user = userEvent.setup()

      render(<OAuthLoginButton provider="google" nextPath={nextPath} />)

      await user.click(screen.getByRole('button', { name: /Google로 로그인/ }))

      expect(authMock.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/api/auth/callback'),
        },
      })

      const redirectTo =
        authMock.signInWithOAuth.mock.calls[0][0].options.redirectTo
      const url = new URL(redirectTo)
      expect(url.searchParams.get('next')).toBe(expectedNext)
    }
  )
})
