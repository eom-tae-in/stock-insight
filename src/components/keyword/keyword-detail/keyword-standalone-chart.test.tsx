import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { KeywordStandaloneChart } from './keyword-standalone-chart'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({
    children,
    data,
  }: {
    children: React.ReactNode
    data: unknown[]
  }) => (
    <div data-testid="line-chart" data-points={data.length}>
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

const chartData = [
  {
    weekIndex: 1,
    date: '2026-01-05',
    trendsValue: 40,
    ma13Value: null,
    yoyValue: null,
  },
  {
    weekIndex: 2,
    date: '2026-01-12',
    trendsValue: 60,
    ma13Value: 50,
    yoyValue: 12,
  },
]

const visibleLines = {
  trendsValue: true,
  ma13Value: true,
  yoyValue: false,
  stockPrice: true,
}

const manyWeeksChartData = Array.from({ length: 60 }, (_, index) => ({
  weekIndex: index + 1,
  date: `2026-${String(index + 1).padStart(2, '0')}`,
  trendsValue: index,
  ma13Value: index > 12 ? index - 1 : null,
  yoyValue: index > 52 ? 10 : null,
}))

describe('KeywordStandaloneChart', () => {
  it('renders an empty state when there is no chart data', () => {
    render(
      <KeywordStandaloneChart
        keyword="AI"
        chartData={[]}
        formattedDate="2026-01-12"
        visibleLines={visibleLines}
        onToggleLine={vi.fn()}
      />
    )

    expect(screen.getByText('데이터 없음')).toBeInTheDocument()
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
  })

  it('renders header actions, controls, chart actions, and selected visible lines', () => {
    render(
      <KeywordStandaloneChart
        keyword="AI"
        chartData={chartData}
        formattedDate="2026-01-12"
        headerActions={<button type="button">헤더 액션</button>}
        controls={<div>기간 컨트롤</div>}
        chartActions={<button type="button">차트 액션</button>}
        overlayStock={{
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
          priceData: [{ date: '2026-01-12', price: 120 }],
        }}
        visibleLines={visibleLines}
        onToggleLine={vi.fn()}
      />
    )

    expect(screen.getByText('AI')).toBeInTheDocument()
    expect(screen.getByText('헤더 액션')).toBeInTheDocument()
    expect(screen.getByText('기간 컨트롤')).toBeInTheDocument()
    expect(screen.getByText('차트 액션')).toBeInTheDocument()
    expect(screen.getByTestId('line-trendsValue')).toBeInTheDocument()
    expect(screen.getByTestId('line-ma13Value')).toBeInTheDocument()
    expect(screen.queryByTestId('line-yoyValue')).not.toBeInTheDocument()
    expect(screen.getByTestId('line-stockPrice')).toHaveTextContent('AAPL 주가')
  })

  it('calls onToggleLine with the selected line key', async () => {
    const user = userEvent.setup()
    const onToggleLine = vi.fn()
    render(
      <KeywordStandaloneChart
        keyword="AI"
        chartData={chartData}
        formattedDate="2026-01-12"
        visibleLines={visibleLines}
        onToggleLine={onToggleLine}
      />
    )

    await user.click(
      screen.getByRole('button', { name: '13주 이동평균(13주 MA)' })
    )

    expect(onToggleLine).toHaveBeenCalledWith('ma13Value')
  })

  it.each([
    {
      timeframeType: 'weeks' as const,
      timeframeValue: 3,
      expectedPoints: 3,
    },
    {
      timeframeType: 'years' as const,
      timeframeValue: 1,
      expectedPoints: 52,
    },
  ])(
    'filters chart data by $timeframeType timeframe',
    ({ timeframeType, timeframeValue, expectedPoints }) => {
      render(
        <KeywordStandaloneChart
          keyword="AI"
          chartData={manyWeeksChartData}
          formattedDate="2026-02-28"
          timeframeType={timeframeType}
          timeframeValue={timeframeValue}
          visibleLines={visibleLines}
          onToggleLine={vi.fn()}
        />
      )

      expect(screen.getByTestId('line-chart')).toHaveAttribute(
        'data-points',
        String(expectedPoints)
      )
      expect(
        screen.getByText(`표시 데이터 (${expectedPoints}주)`)
      ).toBeInTheDocument()
    }
  )

  it('renders persisted overlay lines independently from the selected stock overlay', () => {
    render(
      <KeywordStandaloneChart
        keyword="AI"
        chartData={chartData}
        formattedDate="2026-01-12"
        overlays={[
          {
            id: 'overlay-1',
            ticker: 'MSFT',
            companyName: 'Microsoft',
            chartData: [
              {
                date: '2026-01-12',
                normalizedPrice: 88,
                rawPrice: 310,
              },
            ],
          },
        ]}
        visibleLines={{
          ...visibleLines,
          stockPrice: false,
        }}
        onToggleLine={vi.fn()}
      />
    )

    expect(screen.getByTestId('line-overlay_overlay-1')).toHaveTextContent(
      'MSFT'
    )
    expect(screen.queryByTestId('line-stockPrice')).not.toBeInTheDocument()
  })
})
