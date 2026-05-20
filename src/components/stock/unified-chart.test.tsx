import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UnifiedChart } from './unified-chart'
import { captureChartAsPng } from '@/lib/export'
import { toast } from 'sonner'
import type { PriceDataPoint } from '@/types'

vi.mock('@/hooks/use-chart-theme', () => ({
  useChartTheme: () => ({
    gridColor: '#e5e7eb',
    axisColor: '#6b7280',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e7eb',
  }),
}))

vi.mock('@/lib/export', () => ({
  captureChartAsPng: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

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
  Line: ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid={`line-${dataKey}`}>{name}</div>
  ),
  Area: ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid={`area-${dataKey}`}>{name}</div>
  ),
}))

const priceData: PriceDataPoint[] = Array.from({ length: 70 }, (_, index) => ({
  date: `2026-W${String(index + 1).padStart(2, '0')}`,
  open: 90 + index,
  close: 100 + index,
  low: 80 + index,
  high: 110 + index,
}))

const metrics = {
  currentPrice: 169,
  ma13: 160,
  yoyChange: 12,
}

describe('UnifiedChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the default series and download control', () => {
    render(
      <UnifiedChart
        ticker="AAPL"
        currency="USD"
        priceData={priceData}
        ma13={priceData.map(point => point.close)}
        metrics={metrics}
      />
    )

    expect(screen.getByText('통합 분석 차트')).toBeInTheDocument()
    expect(screen.queryByTestId('line-open')).not.toBeInTheDocument()
    expect(screen.getByTestId('line-close')).toHaveTextContent('종가')
    expect(screen.getByTestId('area-ma13')).toHaveTextContent('13주 MA')
    expect(screen.getByTestId('area-yoy')).toHaveTextContent('52주 YoY')
    expect(
      screen.getByRole('button', { name: '통합 분석 차트를 PNG로 다운로드' })
    ).toBeInTheDocument()
  })

  it('uses initial enabled series and time range when provided', () => {
    render(
      <UnifiedChart
        ticker="AAPL"
        currency="USD"
        priceData={priceData}
        ma13={priceData.map(point => point.close)}
        metrics={metrics}
        initialEnabledSeries={['open', 'high']}
        timeRange={52}
      />
    )

    expect(screen.getByTestId('line-open')).toHaveTextContent('시가')
    expect(screen.getByTestId('line-high')).toHaveTextContent('고가')
    expect(screen.queryByTestId('line-close')).not.toBeInTheDocument()
    expect(screen.queryByTestId('area-ma13')).not.toBeInTheDocument()
  })

  it('disables long-history series when the selected range is too short', async () => {
    const user = userEvent.setup()
    render(
      <UnifiedChart
        ticker="AAPL"
        currency="USD"
        priceData={priceData}
        ma13={priceData.map(point => point.close)}
        metrics={metrics}
      />
    )

    await user.clear(screen.getByPlaceholderText('주'))
    await user.type(screen.getByPlaceholderText('주'), '10')

    expect(
      screen.getByRole('button', {
        name: '13주 이동평균 기준 전년동기 대비 증감률(52주 YoY)',
      })
    ).toBeDisabled()
    expect(screen.queryByTestId('area-yoy')).not.toBeInTheDocument()
  })

  it('delegates PNG download to the supplied callback when provided', async () => {
    const user = userEvent.setup()
    const onDownload = vi.fn()
    render(
      <UnifiedChart
        ticker="AAPL"
        currency="USD"
        priceData={priceData}
        ma13={priceData.map(point => point.close)}
        metrics={metrics}
        onDownload={onDownload}
      />
    )

    await user.click(
      screen.getByRole('button', { name: '통합 분석 차트를 PNG로 다운로드' })
    )

    expect(onDownload).toHaveBeenCalledTimes(1)
  })

  it('captures the chart as PNG and shows a success toast', async () => {
    const user = userEvent.setup()
    vi.mocked(captureChartAsPng).mockResolvedValue(undefined)

    render(
      <UnifiedChart
        ticker="AAPL"
        currency="USD"
        priceData={priceData}
        ma13={priceData.map(point => point.close)}
        metrics={metrics}
      />
    )

    await user.click(
      screen.getByRole('button', { name: '통합 분석 차트를 PNG로 다운로드' })
    )

    expect(captureChartAsPng).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
      ticker: 'AAPL',
      chartName: 'unified-chart',
    })
    expect(toast.success).toHaveBeenCalledWith(
      '차트가 PNG로 다운로드되었습니다.'
    )
  })

  it('shows an error toast when PNG capture fails', async () => {
    const user = userEvent.setup()
    vi.mocked(captureChartAsPng).mockRejectedValue(new Error('capture failed'))

    render(
      <UnifiedChart
        ticker="AAPL"
        currency="USD"
        priceData={priceData}
        ma13={priceData.map(point => point.close)}
        metrics={metrics}
      />
    )

    await user.click(
      screen.getByRole('button', { name: '통합 분석 차트를 PNG로 다운로드' })
    )

    expect(toast.error).toHaveBeenCalledWith('capture failed')
  })

  it('does not capture PNG when ticker is missing', async () => {
    const user = userEvent.setup()

    render(
      <UnifiedChart
        ticker=""
        currency="USD"
        priceData={priceData}
        ma13={priceData.map(point => point.close)}
        metrics={metrics}
      />
    )

    await user.click(
      screen.getByRole('button', { name: '통합 분석 차트를 PNG로 다운로드' })
    )

    expect(captureChartAsPng).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('차트를 찾을 수 없습니다.')
  })
})
