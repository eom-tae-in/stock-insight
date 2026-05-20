import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CustomChartView } from './custom-chart-view'
import type { CustomChart, Metrics, PriceDataPoint } from '@/types'

vi.mock('@/components/stock/unified-chart', () => ({
  UnifiedChart: ({
    initialEnabledSeries,
    timeRange,
  }: {
    initialEnabledSeries: string[]
    timeRange: number
  }) => (
    <div data-testid="unified-chart">
      {initialEnabledSeries.join(',')} / {timeRange}
    </div>
  ),
}))

const metrics: Metrics = {
  currentPrice: 120,
  ma13: 110,
  yoyChange: 10,
}

const priceData: PriceDataPoint[] = [{ date: '2026-01-01', close: 120 }]

function chart(overrides: Partial<CustomChart> = {}): CustomChart {
  return {
    id: 'chart-1',
    name: '내 차트',
    series: ['close', 'ma13'],
    timeRange: 52,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('CustomChartView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when there are no saved charts', () => {
    const { container } = render(
      <CustomChartView
        searchId="search-1"
        ticker="AAPL"
        priceData={priceData}
        metrics={metrics}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('loads saved charts from localStorage and toggles expansion', async () => {
    const user = userEvent.setup()
    localStorage.setItem(
      'stock-custom-charts-search-1',
      JSON.stringify([chart()])
    )

    render(
      <CustomChartView
        searchId="search-1"
        ticker="AAPL"
        priceData={priceData}
        metrics={metrics}
      />
    )

    expect(await screen.findByText('내 차트')).toBeInTheDocument()
    expect(screen.getByTestId('unified-chart')).toHaveTextContent(
      'close,ma13 / 52'
    )

    await user.click(screen.getByRole('button', { expanded: true }))

    expect(screen.queryByTestId('unified-chart')).not.toBeInTheDocument()
  })

  it('refreshes when a customChartUpdated event is received', async () => {
    render(
      <CustomChartView
        searchId="search-1"
        ticker="AAPL"
        priceData={priceData}
        metrics={metrics}
      />
    )

    localStorage.setItem(
      'stock-custom-charts-search-1',
      JSON.stringify([chart({ id: 'chart-2', name: '새 차트' })])
    )
    fireEvent(
      window,
      new CustomEvent('customChartUpdated', {
        detail: { searchId: 'search-1', newChart: { id: 'chart-2' } },
      })
    )

    expect(await screen.findByText('새 차트')).toBeInTheDocument()
  })

  it('deletes a chart after confirmation', async () => {
    const user = userEvent.setup()
    localStorage.setItem(
      'stock-custom-charts-search-1',
      JSON.stringify([chart()])
    )

    render(
      <CustomChartView
        searchId="search-1"
        ticker="AAPL"
        priceData={priceData}
        metrics={metrics}
      />
    )

    expect(await screen.findByText('내 차트')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '' }))

    expect(screen.queryByText('내 차트')).not.toBeInTheDocument()
    expect(localStorage.getItem('stock-custom-charts-search-1')).toBe('[]')
  })
})
