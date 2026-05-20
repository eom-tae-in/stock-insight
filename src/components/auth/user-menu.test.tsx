import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserMenu } from './user-menu'

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))

const authMock = vi.hoisted(() => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}))

vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: authMock,
  }),
}))

describe('UserMenu', () => {
  beforeEach(() => {
    routerMock.push.mockReset()
    routerMock.refresh.mockReset()
    authMock.getUser.mockReset()
    authMock.signOut.mockReset()
  })

  it('renders nothing while there is no authenticated email', async () => {
    authMock.getUser.mockResolvedValue({ data: { user: null } })

    const { container } = render(<UserMenu />)

    await waitFor(() => expect(authMock.getUser).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the user initial/email and logs out', async () => {
    const user = userEvent.setup()
    authMock.getUser.mockResolvedValue({
      data: { user: { email: 'taein@example.com' } },
    })
    authMock.signOut.mockResolvedValue({})

    render(<UserMenu />)

    expect(await screen.findByText('T')).toBeInTheDocument()
    await user.click(screen.getByRole('button'))
    expect(await screen.findByText('taein@example.com')).toBeInTheDocument()
    await user.click(screen.getByText('로그아웃'))

    expect(authMock.signOut).toHaveBeenCalled()
    expect(routerMock.push).toHaveBeenCalledWith('/login')
    expect(routerMock.refresh).toHaveBeenCalled()
  })
})
