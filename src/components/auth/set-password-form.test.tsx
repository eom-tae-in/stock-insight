import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SetPasswordForm } from './set-password-form'

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}))

const authMock = vi.hoisted(() => ({
  updateUser: vi.fn(),
  signOut: vi.fn(),
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

describe('SetPasswordForm', () => {
  beforeEach(() => {
    routerMock.push.mockReset()
    authMock.updateUser.mockReset()
    authMock.signOut.mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
  })

  it.each([
    { password: 'short!', expected: '✗ 8자 이상이어야 합니다' },
    { password: 'password1', expected: '✗ 특수문자를 포함해야 합니다' },
  ])('shows password validation feedback', async ({ password, expected }) => {
    const user = userEvent.setup()

    render(<SetPasswordForm />)

    await user.type(screen.getByPlaceholderText('비밀번호'), password)

    expect(screen.getByText(expected)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '비밀번호 설정 완료' })
    ).toBeDisabled()
  })

  it('shows confirmation mismatch feedback', async () => {
    const user = userEvent.setup()

    render(<SetPasswordForm />)

    await user.type(screen.getByPlaceholderText('비밀번호'), 'validpass!')
    await user.type(screen.getByPlaceholderText('비밀번호 확인'), 'different!')

    expect(
      screen.getByText('✗ 비밀번호가 일치하지 않습니다')
    ).toBeInTheDocument()
  })

  it('updates password, signs out, and navigates to login', async () => {
    const user = userEvent.setup()
    authMock.updateUser.mockResolvedValue({ error: null })
    authMock.signOut.mockResolvedValue({})

    render(<SetPasswordForm />)

    await user.type(screen.getByPlaceholderText('비밀번호'), 'validpass!')
    await user.type(screen.getByPlaceholderText('비밀번호 확인'), 'validpass!')
    await user.click(screen.getByRole('button', { name: '비밀번호 설정 완료' }))

    await waitFor(() =>
      expect(authMock.updateUser).toHaveBeenCalledWith({
        password: 'validpass!',
      })
    )
    expect(authMock.signOut).toHaveBeenCalled()
    expect(toastMock.success).toHaveBeenCalledWith(
      '비밀번호가 설정되었습니다! 로그인해주세요.'
    )
    expect(routerMock.push).toHaveBeenCalledWith('/login')
  })

  it('shows Supabase update errors', async () => {
    const user = userEvent.setup()
    authMock.updateUser.mockResolvedValue({
      error: { message: '세션이 만료되었습니다.' },
    })

    render(<SetPasswordForm />)

    await user.type(screen.getByPlaceholderText('비밀번호'), 'validpass!')
    await user.type(screen.getByPlaceholderText('비밀번호 확인'), 'validpass!')
    await user.click(screen.getByRole('button', { name: '비밀번호 설정 완료' }))

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith('세션이 만료되었습니다.')
    )
    expect(routerMock.push).not.toHaveBeenCalled()
  })
})
