import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { PublicHeader } from './public-header'

vi.mock('@/components/shared/theme-toggle', () => ({ ThemeToggle: () => null }))

it('links the brand to the protected home and removes contents navigation', () => {
  render(<PublicHeader />)
  expect(screen.getByRole('link', { name: 'StockInsight' })).toHaveAttribute(
    'href',
    '/'
  )
  expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute(
    'href',
    '/login'
  )
  expect(screen.queryByRole('link', { name: '목차' })).not.toBeInTheDocument()
})
