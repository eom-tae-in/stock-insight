import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Header } from './header'

const navigationMock = vi.hoisted(() => ({
  pathname: '/',
}))

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMock.pathname,
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('@/components/auth/user-menu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}))

vi.mock('@/components/shared/theme-toggle', () => ({
  ThemeToggle: () => <button type="button">theme</button>,
}))

describe('Header', () => {
  it.each([
    { pathname: '/stock-analysis', activeText: '종목 분석' },
    { pathname: '/stock-analysis/123', activeText: '종목 분석' },
    { pathname: '/keyword-analysis', activeText: '키워드 분석' },
    { pathname: '/keyword-analysis/search', activeText: '키워드 분석' },
  ])(
    'marks the active navigation item for $pathname',
    ({ pathname, activeText }) => {
      navigationMock.pathname = pathname

      render(<Header />)

      expect(
        screen.getByRole('link', { name: 'StockInsight' })
      ).toHaveAttribute('href', '/')
      expect(screen.getByRole('link', { name: activeText })).toHaveClass(
        'text-primary'
      )
      expect(screen.getByTestId('user-menu')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'theme' })).toBeInTheDocument()
    }
  )
})
