import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from './login-form'

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))

const authMock = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
}))

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}))

vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: authMock,
  }),
}))

vi.mock('sonner', () => ({
  toast: toastMock,
}))

describe('LoginForm', () => {
  beforeEach(() => {
    routerMock.push.mockReset()
    routerMock.refresh.mockReset()
    authMock.signInWithPassword.mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
  })

  it.each([
    { email: '', password: 'password', message: '이메일을 입력해주세요.' },
    {
      email: 'user@example.com',
      password: '',
      message: '비밀번호를 입력해주세요.',
    },
  ])('validates required fields', async ({ email, password, message }) => {
    const user = userEvent.setup()

    render(<LoginForm />)

    if (email) {
      await user.type(screen.getByPlaceholderText('이메일'), email)
    }
    if (password) {
      await user.type(screen.getByPlaceholderText('비밀번호'), password)
    }
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(toastMock.error).toHaveBeenCalledWith(message)
    expect(authMock.signInWithPassword).not.toHaveBeenCalled()
  })

  it('signs in and navigates to a safe next path', async () => {
    const user = userEvent.setup()
    authMock.signInWithPassword.mockResolvedValue({ error: null })

    render(<LoginForm nextPath="/keyword-analysis" />)

    await user.type(screen.getByPlaceholderText('이메일'), 'user@example.com')
    await user.type(screen.getByPlaceholderText('비밀번호'), 'password')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() =>
      expect(authMock.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password',
      })
    )
    expect(toastMock.success).toHaveBeenCalledWith('로그인 성공했습니다!')
    expect(routerMock.push).toHaveBeenCalledWith('/keyword-analysis')
    expect(routerMock.refresh).toHaveBeenCalled()
  })

  it('falls back to root for unsafe next paths', async () => {
    const user = userEvent.setup()
    authMock.signInWithPassword.mockResolvedValue({ error: null })

    render(<LoginForm nextPath="//evil.example" />)

    await user.type(screen.getByPlaceholderText('이메일'), 'user@example.com')
    await user.type(screen.getByPlaceholderText('비밀번호'), 'password')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith('/'))
  })

  it('shows a friendly message for invalid credentials', async () => {
    const user = userEvent.setup()
    authMock.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })

    render(<LoginForm />)

    await user.type(screen.getByPlaceholderText('이메일'), 'user@example.com')
    await user.type(screen.getByPlaceholderText('비밀번호'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        '이메일 또는 비밀번호가 올바르지 않습니다.'
      )
    )
  })
})
