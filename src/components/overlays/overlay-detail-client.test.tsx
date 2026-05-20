import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OverlayDetailClient } from '@/components/overlays/overlay-detail-client'
import { apiFetchJson } from '@/lib/fetch-client'
import type { KeywordRecord } from '@/types/database'

const routerMock = vi.hoisted(() => ({
  refresh: vi.fn(),
}))

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}))

vi.mock('sonner', () => ({
  toast: toastMock,
}))

vi.mock('@/lib/fetch-client', () => ({
  apiFetchJson: vi.fn(),
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: ({ name }: { name: string }) => <div>{name}</div>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

const keyword: KeywordRecord = {
  id: 'keyword-1',
  user_id: 'user-1',
  keyword: 'AI',
  region: 'GLOBAL',
  search_type: 'WEB',
  trends_data: [],
  searched_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const chartData = [
  {
    weekIndex: 0,
    date: '2026-01-01',
    trendsValue: 50,
    ma13Value: 48.2,
    yoyValue: 12.34,
  },
]

const overlayChartData = [
  {
    date: '2026-01-01',
    normalizedPrice: 72,
    rawPrice: 123.45,
  },
]

describe('OverlayDetailClient integration', () => {
  beforeEach(() => {
    routerMock.refresh.mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
    vi.mocked(apiFetchJson).mockReset()
  })

  it('renders merged keyword/overlay summary and chart series', () => {
    render(
      <OverlayDetailClient
        keyword={keyword}
        analysisContext={{
          analysisId: 'analysis-1',
          region: 'GLOBAL',
          searchType: 'WEB',
        }}
        overlay={{
          id: 'overlay-1',
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
        }}
        chartData={chartData}
        overlayChartData={overlayChartData}
      />
    )

    expect(
      screen.getByRole('heading', { name: 'AAPL / AI' })
    ).toBeInTheDocument()
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    expect(
      screen.getByText('현재 분석 조건: 전체 · 웹 검색 · 5Y')
    ).toBeInTheDocument()
    expect(screen.getByText('48.20')).toBeInTheDocument()
    expect(screen.getByText('+12.34%')).toHaveClass('text-green-600')
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByText('AAPL 주가')).toBeInTheDocument()
  })

  it('refreshes the overlay and refreshes the route on success', async () => {
    const user = userEvent.setup()
    vi.mocked(apiFetchJson).mockResolvedValue({})

    render(
      <OverlayDetailClient
        keyword={keyword}
        analysisContext={{
          analysisId: 'analysis-1',
          region: 'GLOBAL',
          searchType: 'WEB',
        }}
        overlay={{
          id: 'overlay-1',
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
        }}
        chartData={chartData}
        overlayChartData={overlayChartData}
      />
    )

    await user.click(screen.getByRole('button', { name: /티커 최신화/ }))

    await waitFor(() =>
      expect(apiFetchJson).toHaveBeenCalledWith(
        '/api/analyses/analysis-1/overlays/overlay-1/refreshes',
        { method: 'POST' }
      )
    )
    expect(toastMock.success).toHaveBeenCalledWith(
      '티커 연동 차트를 최신화했습니다.'
    )
    expect(routerMock.refresh).toHaveBeenCalled()
  })

  it('shows a toast when overlay refresh fails', async () => {
    const user = userEvent.setup()
    vi.mocked(apiFetchJson).mockRejectedValue(new Error('refresh failed'))

    render(
      <OverlayDetailClient
        keyword={keyword}
        analysisContext={{
          analysisId: 'analysis-1',
          region: 'GLOBAL',
          searchType: 'WEB',
        }}
        overlay={{
          id: 'overlay-1',
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
        }}
        chartData={chartData}
        overlayChartData={overlayChartData}
      />
    )

    await user.click(screen.getByRole('button', { name: /티커 최신화/ }))

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith('refresh failed')
    )
    expect(routerMock.refresh).not.toHaveBeenCalled()
  })
})
