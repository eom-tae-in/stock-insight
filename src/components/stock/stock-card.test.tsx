import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StockCard } from './stock-card'

const baseProps = {
  id: 'stock-1',
  ticker: 'AAPL',
  companyName: 'Apple Inc.',
  currency: 'USD',
  weeklyOpen: 100,
  weeklyHigh: 120,
  weeklyLow: 90,
  currentPrice: 110,
  previousClose: 100,
  ma13: 105,
  yoyChange: 12.34,
  lastUpdatedAt: '2026-05-15T00:00:00Z',
}

describe('StockCard', () => {
  it('renders stock summary values and links to the stock detail page', () => {
    render(<StockCard {...baseProps} />)

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/stock-analysis/stock-1'
    )
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    expect(screen.getByText('+10.00%')).toBeInTheDocument()
    expect(screen.getByText('+12.34%')).toBeInTheDocument()
    expect(screen.getByText('2026.05.15')).toBeInTheDocument()
  })

  it('uses red styling for negative weekly and YoY changes', () => {
    render(
      <StockCard
        {...baseProps}
        currentPrice={90}
        previousClose={100}
        yoyChange={-5}
      />
    )

    expect(screen.getByText('-10.00%')).toHaveClass('text-red-600')
    expect(screen.getByText('-5.00%')).toHaveClass('text-red-600')
  })

  it('shows reorder affordance and disables navigation in reorder mode', () => {
    render(<StockCard {...baseProps} editMode="reorder" />)

    expect(screen.getByRole('link')).toHaveAttribute('href', '#')
    expect(screen.getByText('AAPL').closest('[data-slot="card"]')).toHaveClass(
      'cursor-grab'
    )
  })

  it('calls onRefresh from the hover overlay refresh button', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    render(<StockCard {...baseProps} onRefresh={onRefresh} />)

    fireEvent.mouseEnter(
      screen.getByText('AAPL').closest('[data-slot="card"]')!
    )
    await user.click(screen.getByRole('button', { name: '최신화' }))

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1)
    })
  })
})
