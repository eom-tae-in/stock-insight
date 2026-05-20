import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SignupForm } from './signup-form'

const authMock = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
}))

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: authMock,
  }),
}))

vi.mock('sonner', () => ({
  toast: toastMock,
}))

describe('SignupForm', () => {
  beforeEach(() => {
    authMock.signInWithOtp.mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
  })

  it('keeps the submit button disabled until email is entered', () => {
    render(<SignupForm />)

    expect(
      screen.getByRole('button', { name: '인증 이메일 발송' })
    ).toBeDisabled()
  })

  it('validates email format before requesting OTP', async () => {
    const user = userEvent.setup()

    render(<SignupForm />)

    await user.type(screen.getByPlaceholderText('이메일'), 'invalid')
    await user.click(screen.getByRole('button', { name: '인증 이메일 발송' }))

    expect(toastMock.error).toHaveBeenCalledWith(
      '유효한 이메일을 입력해주세요.'
    )
    expect(authMock.signInWithOtp).not.toHaveBeenCalled()
  })

  it('requests OTP and renders the sent state', async () => {
    const user = userEvent.setup()
    authMock.signInWithOtp.mockResolvedValue({ error: null })

    render(<SignupForm />)

    await user.type(screen.getByPlaceholderText('이메일'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: '인증 이메일 발송' }))

    await waitFor(() => expect(authMock.signInWithOtp).toHaveBeenCalled())
    expect(toastMock.success).toHaveBeenCalledWith(
      '인증 이메일이 발송되었습니다!'
    )
    expect(
      screen.getByText('✓ 인증 이메일이 발송되었습니다!')
    ).toBeInTheDocument()
    expect(screen.getByText(/user@example\.com/)).toBeInTheDocument()
  })

  it('shows a duplicate email error from Supabase', async () => {
    const user = userEvent.setup()
    authMock.signInWithOtp.mockResolvedValue({
      error: { message: 'User already registered' },
    })

    render(<SignupForm />)

    await user.type(screen.getByPlaceholderText('이메일'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: '인증 이메일 발송' }))

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith('이미 가입된 이메일입니다.')
    )
  })
})
