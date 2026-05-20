import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import KeywordTrendsChart from './keyword-trends-chart'
import type { SearchRecord, TrendsDataPoint } from '@/types/database'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({
    children,
    data,
  }: {
    children: React.ReactNode
    data: unknown[]
  }) => (
    <div data-testid="composed-chart" data-points={data.length}>
      {children}
    </div>
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: ({ yAxisId }: { yAxisId: string }) => (
    <div data-testid={`y-axis-${yAxisId}`} />
  ),
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Line: ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid={`line-${dataKey}`}>{name}</div>
  ),
}))

const trendsData: TrendsDataPoint[] = [
  {
    date: '2026-01-05',
    value: 40,
    ma13Value: null,
    yoyValue: null,
  },
  {
    date: '2026-01-12',
    value: 60,
    ma13Value: null,
    yoyValue: null,
  },
]

const overlay = {
  id: 'overlay-1',
  ticker: 'AAPL',
  price_data: [
    {
      date: '2026-01-05',
      close: 100,
    },
    {
      date: '2026-01-12',
      close: 120,
    },
  ],
} as SearchRecord

describe('KeywordTrendsChart', () => {
  it('renders trend, MA, YoY, and overlay series when data is available', () => {
    render(
      <KeywordTrendsChart
        trendsData={trendsData}
        overlays={[overlay]}
        ma13Values={[40, 50]}
        yoyValuesArray={[null, 12]}
      />
    )

    expect(screen.getByText('트렌드 분석 차트')).toBeInTheDocument()
    expect(screen.getByTestId('line-trendsValue')).toHaveTextContent(
      '검색량 기반'
    )
    expect(screen.getByTestId('line-ma13')).toHaveTextContent('13주 이동평균')
    expect(screen.getByTestId('line-yoyValue')).toHaveTextContent('52주 YoY')
    expect(screen.getByTestId('line-overlay0')).toHaveTextContent('AAPL 주가')
  })

  it('hides YoY controls when all YoY values are empty', () => {
    render(
      <KeywordTrendsChart
        trendsData={trendsData}
        overlays={[]}
        ma13Values={[40, 50]}
        yoyValuesArray={[null, null]}
      />
    )

    expect(
      screen.queryByRole('button', { name: /52주 YoY/ })
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('line-yoyValue')).not.toBeInTheDocument()
  })

  it('toggles a visible trend series off when the user clicks its control', async () => {
    const user = userEvent.setup()
    render(
      <KeywordTrendsChart
        trendsData={trendsData}
        overlays={[]}
        ma13Values={[40, 50]}
        yoyValuesArray={[null, 12]}
      />
    )

    await user.click(screen.getByRole('button', { name: /^검색량 기반$/ }))

    expect(screen.queryByTestId('line-trendsValue')).not.toBeInTheDocument()
    expect(
      screen.queryByText('검색량 기반: Google Trends 검색 관심도 (0-100)')
    ).not.toBeInTheDocument()
  })
})
