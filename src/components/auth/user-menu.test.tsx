import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserMenu } from './user-menu'
import { ThemeProvider } from '@/components/providers/theme-provider'

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

  it('opens the selected mode with keyboard focus and preserves logout', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })
    )
    localStorage.setItem('theme', 'system')
    authMock.getUser.mockResolvedValue({
      data: { user: { email: 'taein@example.com' } },
    })
    const user = userEvent.setup()
    render(
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        themes={['light', 'dark']}
      >
        <UserMenu />
      </ThemeProvider>
    )
    await screen.findByText('T')
    await user.tab()
    await user.keyboard('{Enter}')
    const system = await screen.findByRole('radio', { name: '시스템' })
    expect(system).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: '라이트' })).toBeChecked()
    expect(localStorage.getItem('theme')).toBe('light')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: '다크' })).toBeChecked()
    expect(localStorage.getItem('theme')).toBe('dark')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button')).toHaveFocus()
  })
})
