import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OverlayCard } from './overlay-card'
import type { KeywordStockOverlay } from '@/types/database'

function makeOverlay(
  overrides: Partial<KeywordStockOverlay> & {
    current_price?: number
    yoy_change?: number
  } = {}
) {
  return {
    id: 'overlay-1',
    ticker: 'AAPL',
    company_name: 'Apple Inc.',
    display_order: 0,
    created_at: '2026-05-18T00:00:00.000Z',
    current_price: 123.456,
    yoy_change: 12.34,
    ...overrides,
  }
}

describe('OverlayCard', () => {
  it('renders overlay summary and links to the overlay detail page', () => {
    render(<OverlayCard overlay={makeOverlay()} keywordId="keyword-1" />)

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/keywords/keyword-1/overlays/overlay-1'
    )
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    expect(screen.getByText('$123.46')).toBeInTheDocument()
    expect(screen.getByText('+12.3%')).toBeInTheDocument()
  })

  it.each([
    { yoyChange: 7.89, text: '+7.9%', expectedClass: 'text-green-600' },
    { yoyChange: -7.89, text: '-7.9%', expectedClass: 'text-red-600' },
    { yoyChange: undefined, text: '—', expectedClass: 'text-muted-foreground' },
  ])(
    'renders YoY display for $text state',
    ({ yoyChange, text, expectedClass }) => {
      render(
        <OverlayCard
          overlay={makeOverlay({ yoy_change: yoyChange })}
          keywordId="keyword-1"
        />
      )

      expect(screen.getByText(text)).toHaveClass(expectedClass)
    }
  )

  it('renders fallback price when current price is missing', () => {
    render(
      <OverlayCard
        overlay={makeOverlay({ current_price: undefined })}
        keywordId="keyword-1"
      />
    )

    expect(screen.getAllByText(/—/)).not.toHaveLength(0)
  })
})
