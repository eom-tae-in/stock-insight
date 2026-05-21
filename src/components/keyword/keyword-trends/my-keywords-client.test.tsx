import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MyKeywordsClient } from '@/components/keyword/keyword-trends/my-keywords-client'
import { apiFetch, apiFetchJson } from '@/lib/fetch-client'
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

vi.mock('@/lib/fetch-client', () => ({
  apiFetch: vi.fn(),
  apiFetchJson: vi.fn(),
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="condition-chart">{children}</div>
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

function makeKeyword(overrides: Partial<KeywordRecord> = {}): KeywordRecord {
  return {
    id: 'keyword-1',
    user_id: 'user-1',
    keyword: 'AI',
    region: 'GLOBAL',
    search_type: 'WEB',
    trends_data: [
      {
        date: '2026-01-01',
        value: 50,
        ma13Value: 48,
        yoyValue: 12,
      },
    ],
    searched_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
    display_order: 1,
    analyses: [
      {
        id: 'analysis-1',
        keyword_id: 'keyword-1',
        region: 'GLOBAL',
        period: '5Y',
        search_type: 'WEB',
        trends_data: [
          {
            date: '2026-01-01',
            value: 50,
            ma13Value: 48,
            yoyValue: 12,
          },
        ],
        overlays: [
          {
            id: 'overlay-1',
            analysis_id: 'analysis-1',
            ticker: 'AAPL',
            company_name: 'Apple Inc.',
            display_order: 1,
            created_at: '2026-01-01T00:00:00.000Z',
            chart_data: [
              {
                date: '2026-01-01',
                normalizedPrice: 70,
                rawPrice: 180,
              },
            ],
          },
        ],
        updated_at: '2026-01-02T00:00:00.000Z',
      },
    ],
    ...overrides,
  }
}

describe('MyKeywordsClient integration', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
    routerMock.push.mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
    toastMock.info.mockReset()
    vi.mocked(apiFetch).mockReset()
    vi.mocked(apiFetchJson).mockReset()
    vi.mocked(apiFetchJson).mockImplementation(async input => {
      if (String(input) === '/api/keywords') return []
      throw new Error(`Unexpected request: ${String(input)}`)
    })
  })

  it('renders the empty state when there are no saved keywords', async () => {
    render(<MyKeywordsClient initialKeywords={[]} />)

    expect(
      await screen.findByText('아직 저장된 키워드가 없어요')
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '검색하기' })).toHaveAttribute(
      'href',
      '/keyword-analysis/new'
    )
  })

  it('filters keyword cards by search query', async () => {
    const user = userEvent.setup()
    const keywords = [
      makeKeyword(),
      makeKeyword({
        id: 'keyword-2',
        keyword: 'Battery',
        display_order: 2,
      }),
    ]
    vi.mocked(apiFetchJson).mockImplementation(async input => {
      if (String(input) === '/api/keywords') return keywords
      throw new Error(`Unexpected request: ${String(input)}`)
    })

    render(<MyKeywordsClient initialKeywords={keywords} />)

    expect(await screen.findByText('Battery')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('키워드 검색'), 'battery')

    expect(screen.getByText('Battery')).toBeInTheDocument()
    expect(screen.queryByText('AI')).not.toBeInTheDocument()
  })

  it('deletes selected keywords through edit mode and refreshes local state', async () => {
    const user = userEvent.setup()
    const keyword = makeKeyword()
    vi.mocked(apiFetch).mockResolvedValue(new Response(null, { status: 204 }))
    vi.mocked(apiFetchJson).mockImplementation(async input => {
      if (String(input) === '/api/keywords') return [keyword]
      throw new Error(`Unexpected request: ${String(input)}`)
    })

    render(<MyKeywordsClient initialKeywords={[keyword]} />)

    expect(await screen.findByText('AI')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /편집/ }))
    await user.click(screen.getByRole('button', { name: /삭제/ }))
    await user.click(screen.getByRole('button', { name: '전체 선택' }))
    await user.click(screen.getAllByRole('button', { name: /삭제/ }).at(-1)!)

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: '삭제' }))

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/api/keywords/keyword-1', {
        method: 'DELETE',
      })
    )
    expect(toastMock.success).toHaveBeenCalledWith(
      '1개 키워드가 삭제되었습니다.'
    )
    expect(screen.getByText('아직 저장된 키워드가 없어요')).toBeInTheDocument()
  })

  it('patches a keyword edit from the parent client and updates the card text', async () => {
    const user = userEvent.setup()
    const keyword = makeKeyword()
    vi.mocked(apiFetch).mockResolvedValue(new Response(null, { status: 200 }))
    vi.mocked(apiFetchJson).mockImplementation(async input => {
      if (String(input) === '/api/keywords') return [keyword]
      throw new Error(`Unexpected request: ${String(input)}`)
    })

    render(<MyKeywordsClient initialKeywords={[keyword]} />)

    expect(await screen.findByText('AI')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /편집/ }))
    await user.click(screen.getByRole('button', { name: /삭제/ }))
    await user.click(screen.getByRole('button', { name: '키워드 수정' }))

    const input = screen.getByPlaceholderText('키워드 입력')
    await user.clear(input)
    await user.type(input, 'AI semiconductor')
    await user.click(screen.getByRole('button', { name: /저장/ }))

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/api/keywords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'keyword-1',
          keyword: 'AI semiconductor',
        }),
      })
    )
    expect(toastMock.success).toHaveBeenCalledWith('키워드가 수정되었습니다.')
    expect(screen.getByText('AI semiconductor')).toBeInTheDocument()
  })

  it('saves keyword reorder mode through the reorder API', async () => {
    const user = userEvent.setup()
    const keywords = [
      makeKeyword(),
      makeKeyword({
        id: 'keyword-2',
        keyword: 'Battery',
        display_order: 2,
      }),
    ]
    vi.mocked(apiFetchJson).mockImplementation(async input => {
      if (String(input) === '/api/keywords') return keywords
      if (String(input) === '/api/keywords/reorder') return {}
      throw new Error(`Unexpected request: ${String(input)}`)
    })

    render(<MyKeywordsClient initialKeywords={keywords} />)

    expect(await screen.findByText('Battery')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /편집/ }))
    await user.click(screen.getByRole('button', { name: /순서 변경/ }))
    await user.click(screen.getByRole('button', { name: /완료/ }))

    await waitFor(() =>
      expect(apiFetchJson).toHaveBeenCalledWith('/api/keywords/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: ['keyword-1', 'keyword-2'] }),
      })
    )
    expect(toastMock.success).toHaveBeenCalledWith(
      '키워드 위치가 저장되었습니다.'
    )
  })

  it('saves condition reorder mode through the analysis reorder API', async () => {
    const user = userEvent.setup()
    const keyword = makeKeyword()
    vi.mocked(apiFetchJson).mockImplementation(async input => {
      if (String(input) === '/api/keywords') return [keyword]
      if (String(input) === '/api/analyses/reorder') return {}
      throw new Error(`Unexpected request: ${String(input)}`)
    })

    render(<MyKeywordsClient initialKeywords={[keyword]} />)

    await user.click(
      await screen.findByRole('button', { name: '키워드 + 분석 조건' })
    )
    await user.click(screen.getByRole('button', { name: /편집/ }))
    await user.click(screen.getByRole('button', { name: /순서 변경/ }))
    await user.click(screen.getByRole('button', { name: /완료/ }))

    await waitFor(() =>
      expect(apiFetchJson).toHaveBeenCalledWith('/api/analyses/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: ['analysis-1'] }),
      })
    )
    expect(toastMock.success).toHaveBeenCalledWith(
      '조건 위치가 저장되었습니다.'
    )
  })

  it('refreshes an analysis condition in condition mode', async () => {
    const user = userEvent.setup()
    const keyword = makeKeyword()
    vi.mocked(apiFetchJson).mockImplementation(async input => {
      if (String(input) === '/api/analyses/analysis-1/refreshes') return {}
      if (String(input) === '/api/keywords') return [keyword]
      throw new Error(`Unexpected request: ${String(input)}`)
    })

    render(<MyKeywordsClient initialKeywords={[keyword]} />)

    await user.click(screen.getByRole('button', { name: '키워드 + 분석 조건' }))
    await user.click(screen.getByRole('button', { name: /분석 최신화/ }))

    await waitFor(() =>
      expect(apiFetchJson).toHaveBeenCalledWith(
        '/api/analyses/analysis-1/refreshes',
        { method: 'POST' }
      )
    )
    expect(toastMock.success).toHaveBeenCalledWith(
      '분석 조건을 최신화했습니다.'
    )
  })

  it('refreshes a linked chart and reloads keyword cards in ticker mode', async () => {
    const user = userEvent.setup()
    const keyword = makeKeyword()
    vi.mocked(apiFetchJson).mockImplementation(async input => {
      if (
        String(input) ===
        '/api/analyses/analysis-1/overlays/overlay-1/refreshes'
      ) {
        return {}
      }
      if (String(input) === '/api/keywords') return [keyword]
      throw new Error(`Unexpected request: ${String(input)}`)
    })

    render(<MyKeywordsClient initialKeywords={[keyword]} />)

    await user.click(
      screen.getByRole('button', {
        name: '키워드 + 분석 조건 + 티커 연동',
      })
    )
    await user.click(screen.getByRole('button', { name: /연동 차트 최신화/ }))

    await waitFor(() =>
      expect(apiFetchJson).toHaveBeenCalledWith(
        '/api/analyses/analysis-1/overlays/overlay-1/refreshes',
        { method: 'POST' }
      )
    )
    expect(apiFetchJson).toHaveBeenCalledWith('/api/keywords')
    expect(toastMock.success).toHaveBeenCalledWith(
      '연동 차트를 최신화했습니다.'
    )
  })
})
