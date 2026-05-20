import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetricsSummary } from './metrics-summary'
import type { Metrics } from '@/types'

const metrics: Metrics = {
  currentPrice: 123.456,
  previousClose: 120,
  ma13: 111.234,
  yoyChange: 12.34,
}

describe('MetricsSummary', () => {
  it('renders the three summary metrics with ticker-derived USD formatting', () => {
    render(<MetricsSummary metrics={metrics} ticker="AAPL" />)

    expect(screen.getByText('지난주 종가')).toBeInTheDocument()
    expect(screen.getByText('최근 13주 평균 (MA13)')).toBeInTheDocument()
    expect(
      screen.getByText('13주 이동평균 기준 전년동기 대비 증감률(52주 YoY)')
    ).toBeInTheDocument()
    expect(screen.getByText('123.46')).toBeInTheDocument()
    expect(screen.getByText('111.23')).toBeInTheDocument()
    expect(screen.getAllByText('$')).toHaveLength(2)
    expect(screen.getByText('12.34')).toHaveClass('text-green-600')
  })

  it('uses explicit currency when provided', () => {
    render(<MetricsSummary metrics={metrics} ticker="AAPL" currency="KRW" />)

    expect(screen.getByText('123')).toBeInTheDocument()
    expect(screen.getByText('111')).toBeInTheDocument()
    expect(screen.getAllByText('₩')).toHaveLength(2)
  })

  it.each([
    { yoyChange: 8.5, expectedClass: 'text-green-600' },
    { yoyChange: -8.5, expectedClass: 'text-red-600' },
  ])(
    'passes the YoY sign state to the metric card',
    ({ yoyChange, expectedClass }) => {
      render(
        <MetricsSummary metrics={{ ...metrics, yoyChange }} ticker="AAPL" />
      )

      expect(screen.getByText(yoyChange >= 0 ? '8.50' : '-8.50')).toHaveClass(
        expectedClass
      )
    }
  )

  it('renders the 기준점 explanation only when lastUpdatedAt is provided', () => {
    const { rerender } = render(
      <MetricsSummary
        metrics={metrics}
        ticker="AAPL"
        lastUpdatedAt="2026-05-18T12:00:00.000Z"
      />
    )

    expect(screen.getByText(/2026\.05\.18/)).toBeInTheDocument()

    rerender(<MetricsSummary metrics={metrics} ticker="AAPL" />)

    expect(screen.queryByText(/기준점:/)).not.toBeInTheDocument()
  })
})
