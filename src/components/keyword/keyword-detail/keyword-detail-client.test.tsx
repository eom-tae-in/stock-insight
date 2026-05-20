import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KeywordDetailClient } from '@/components/keyword/keyword-detail/keyword-detail-client'
import type React from 'react'
import type { KeywordRecord } from '@/types/database'

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}))

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}))

vi.mock('sonner', () => ({
  toast: toastMock,
}))

vi.mock('@/components/keyword/keyword-detail/keyword-standalone-chart', () => ({
  KeywordStandaloneChart: ({
    keyword,
    controls,
    headerActions,
    chartActions,
  }: {
    keyword: string
    controls?: React.ReactNode
    headerActions?: React.ReactNode
    chartActions?: React.ReactNode
  }) => (
    <div data-testid="standalone-chart">
      <div>{keyword} chart</div>
      {headerActions}
      {controls}
      {chartActions}
    </div>
  ),
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mini-chart">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

class IntersectionObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()
}

const keyword: KeywordRecord = {
  id: 'keyword-1',
  user_id: 'user-1',
  keyword: 'AI',
  region: 'GLOBAL',
  search_type: 'WEB',
  trends_data: [],
  searched_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
}

const trendsData = [
  {
    date: '2026-01-01',
    value: 50,
    ma13Value: 48,
    yoyValue: 12,
  },
]

const analysis = {
  id: 'analysis-1',
  keyword_id: 'keyword-1',
  region: 'GLOBAL',
  period: '5Y',
  search_type: 'WEB',
  trends_data: trendsData,
  updated_at: '2026-01-02T00:00:00.000Z',
}

const overlay = {
  id: 'overlay-1',
  ticker: 'AAPL',
  company_name: 'Apple Inc.',
  display_order: 1,
  chart_data: [
    {
      date: '2026-01-01',
      rawPrice: 180,
    },
  ],
}

function mockFetchForDetail() {
  vi.mocked(fetch).mockImplementation(async input => {
    const url = String(input)
    if (url === '/api/keywords/keyword-1/analyses') {
      return Response.json({ data: [analysis] })
    }
    if (
      url === '/api/keywords/keyword-1/analyses?region=GLOBAL&searchType=WEB'
    ) {
      return Response.json({ data: analysis })
    }
    if (url === '/api/analyses/analysis-1/overlays') {
      return Response.json({ data: [overlay] })
    }
    if (url === '/api/analyses/analysis-1/refreshes') {
      return Response.json({ data: { ...analysis, trends_data: trendsData } })
    }
    if (url === '/api/analyses/analysis-1/overlays/overlay-1/refreshes') {
      return Response.json({ data: overlay })
    }
    if (url === '/api/analyses/analysis-1/overlays/overlay-1') {
      return new Response(null, { status: 204 })
    }
    return new Response('not found', { status: 404 })
  })
}

describe('KeywordDetailClient integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
    routerMock.push.mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
    toastMock.info.mockReset()
  })

  it('loads analyses, current analysis, and overlay cards for the selected keyword', async () => {
    mockFetchForDetail()

    render(
      <KeywordDetailClient
        keywordId="keyword-1"
        keyword={keyword}
        initialSearchParams={{
          region: 'GLOBAL',
          period: '5Y',
          searchType: 'WEB',
        }}
      />
    )

    expect(
      await screen.findByRole('heading', { name: /AI\s*키워드 분석/ })
    ).toBeInTheDocument()
    expect(await screen.findByText('전체 · 웹 검색 · 5Y')).toBeInTheDocument()
    expect(screen.getByTestId('standalone-chart')).toHaveTextContent('AI chart')
    expect(await screen.findByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
  })

  it('refreshes the current analysis', async () => {
    const user = userEvent.setup()
    mockFetchForDetail()

    render(
      <KeywordDetailClient
        keywordId="keyword-1"
        keyword={keyword}
        initialSearchParams={{
          region: 'GLOBAL',
          period: '5Y',
          searchType: 'WEB',
        }}
      />
    )

    await screen.findByText('AAPL')
    await user.click(screen.getByRole('button', { name: /현재 분석 최신화/ }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/api/analyses/analysis-1/refreshes', {
        method: 'POST',
      })
    )
    expect(toastMock.success).toHaveBeenCalledWith(
      '키워드 분석을 최신화했습니다'
    )
  })

  it('deletes selected overlays through edit mode and confirmation dialog', async () => {
    const user = userEvent.setup()
    mockFetchForDetail()

    render(
      <KeywordDetailClient
        keywordId="keyword-1"
        keyword={keyword}
        initialSearchParams={{
          region: 'GLOBAL',
          period: '5Y',
          searchType: 'WEB',
        }}
      />
    )

    await screen.findByText('AAPL')
    await user.click(screen.getByRole('button', { name: /편집/ }))
    await user.click(screen.getByRole('button', { name: /선택 삭제/ }))
    await user.click(screen.getByRole('checkbox', { name: 'AAPL 선택' }))
    await user.click(screen.getAllByRole('button', { name: '삭제' }).at(-1)!)

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: '삭제' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/analyses/analysis-1/overlays/overlay-1',
        { method: 'DELETE' }
      )
    )
    expect(toastMock.success).toHaveBeenCalledWith('1개 종목이 삭제되었습니다')
    expect(screen.queryByText('Apple Inc.')).not.toBeInTheDocument()
  })
})
