import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import KeywordTrendsClient from '@/components/keyword/keyword-trends/keyword-trends-client'
import { apiFetchJson } from '@/lib/fetch-client'
import type { TrendsDataPoint } from '@/types'

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}))

const searchParamsMock = vi.hoisted(() => ({
  params: new URLSearchParams(),
}))

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  useSearchParams: () => searchParamsMock.params,
}))

vi.mock('sonner', () => ({
  toast: toastMock,
}))

vi.mock('@/lib/fetch-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/fetch-client')>()
  return {
    ...actual,
    apiFetchJson: vi.fn(),
    apiFetch: vi.fn(),
  }
})

vi.mock('@/components/keyword/keyword-trends/keyword-trends-chart', () => ({
  default: ({ trendsData }: { trendsData: TrendsDataPoint[] }) => (
    <div data-testid="keyword-trends-chart">{trendsData.length} points</div>
  ),
}))

function makeTrendsData(count: number): TrendsDataPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    date: `2025-01-${String(index + 1).padStart(2, '0')}`,
    value: 20 + index,
    ma13Value: index >= 12 ? 20 + index / 2 : null,
    yoyValue: index >= 52 ? 5 : null,
  }))
}

describe('KeywordTrendsClient integration', () => {
  beforeEach(() => {
    routerMock.push.mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
    vi.mocked(apiFetchJson).mockReset()
    searchParamsMock.params = new URLSearchParams({
      keyword: 'AI',
      geo: 'GLOBAL',
      gprop: 'WEB',
    })
  })

  it('loads trends from the URL query and renders the chart/summary flow', async () => {
    vi.mocked(apiFetchJson).mockImplementation(async input => {
      const url = String(input)
      if (url === '/api/keywords') return []
      if (url.startsWith('/api/trends?')) {
        return {
          keyword: 'AI',
          trendsData: makeTrendsData(65),
        }
      }
      throw new Error(`Unexpected request: ${url}`)
    })

    render(<KeywordTrendsClient />)

    expect(await screen.findByText('AI')).toBeInTheDocument()
    expect(await screen.findByTestId('keyword-trends-chart')).toHaveTextContent(
      '65 points'
    )
    expect(screen.getByText('13주 이동평균(13주 MA)')).toBeInTheDocument()
    expect(screen.getByText('5년 트렌드 분석')).toBeInTheDocument()
  })

  it('saves the loaded keyword and navigates back to the keyword dashboard', async () => {
    const user = userEvent.setup()
    vi.mocked(apiFetchJson).mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/keywords' && init?.method === 'POST') return {}
      if (url === '/api/keywords') return []
      if (url.startsWith('/api/trends?')) {
        return {
          keyword: 'AI',
          trendsData: makeTrendsData(65),
        }
      }
      throw new Error(`Unexpected request: ${url}`)
    })

    render(<KeywordTrendsClient />)

    await screen.findByTestId('keyword-trends-chart')
    await user.click(screen.getByRole('button', { name: '키워드 저장' }))

    await waitFor(() =>
      expect(apiFetchJson).toHaveBeenCalledWith(
        '/api/keywords',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"keyword":"AI"'),
        })
      )
    )
    expect(toastMock.success).toHaveBeenCalledWith(
      '"AI" 키워드가 저장되었습니다'
    )
    expect(routerMock.push).toHaveBeenCalledWith('/keyword-analysis')
  })

  it('renders an error recovery state when trends loading fails', async () => {
    const user = userEvent.setup()
    vi.mocked(apiFetchJson).mockImplementation(async input => {
      const url = String(input)
      if (url === '/api/keywords') return []
      if (url.startsWith('/api/trends?')) throw new Error('트렌드 조회 실패')
      throw new Error(`Unexpected request: ${url}`)
    })

    render(<KeywordTrendsClient />)

    expect(
      await screen.findByText('키워드 데이터를 불러오지 못했습니다')
    ).toBeInTheDocument()
    expect(toastMock.error).toHaveBeenCalledWith('트렌드 조회 실패')

    vi.mocked(apiFetchJson).mockImplementation(async input => {
      const url = String(input)
      if (url === '/api/keywords') return []
      if (url.startsWith('/api/trends?')) {
        return {
          keyword: 'AI',
          trendsData: makeTrendsData(65),
        }
      }
      throw new Error(`Unexpected request: ${url}`)
    })

    await user.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(
      await screen.findByTestId('keyword-trends-chart')
    ).toBeInTheDocument()
  })
})
