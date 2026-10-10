import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StockDetailRail } from './stock-detail-rail'
import type { KeywordRecord, SearchRecord } from '@/types/database'

vi.mock('usehooks-ts', () => ({ useMediaQuery: () => false }))
const record: SearchRecord = {
  id: 's1',
  user_id: 'u1',
  ticker: 'NVDA',
  company_name: 'NVIDIA',
  currency: 'USD',
  price_data: [],
  searched_at: '2026-10-05T00:12:00Z',
}
export const keywords: KeywordRecord[] = [
  {
    id: 'k1',
    user_id: 'u1',
    keyword: 'AI',
    region: 'GLOBAL',
    search_type: 'WEB',
    trends_data: [],
    searched_at: record.searched_at,
    created_at: record.searched_at,
    updated_at: record.searched_at,
    analyses: [
      {
        id: 'a1',
        keyword_id: 'k1',
        region: 'KR',
        search_type: 'NEWS',
        period: '5Y',
        display_order: 0,
        trends_data: [
          { date: '2026-10-05', value: 78, ma13Value: null, yoyValue: null },
        ],
      },
      {
        id: 'a2',
        keyword_id: 'k1',
        region: 'US',
        search_type: 'WEB',
        period: '5Y',
        display_order: 1,
        trends_data: [
          { date: '2026-10-05', value: 22, ma13Value: null, yoyValue: null },
        ],
        overlays: [
          {
            id: 'o1',
            analysis_id: 'a2',
            created_at: record.searched_at,
            ticker: 'nvda',
            company_name: 'NVIDIA',
            display_order: 0,
          },
        ],
      },
    ],
  },
  {
    id: 'k2',
    user_id: 'u1',
    keyword: '반도체',
    region: 'GLOBAL',
    search_type: 'WEB',
    trends_data: [],
    searched_at: record.searched_at,
    created_at: record.searched_at,
    updated_at: record.searched_at,
  },
]

describe('StockDetailRail', () => {
  it('uses representative metrics for linked keywords and offers all owned keywords', async () => {
    const user = userEvent.setup()
    render(
      <StockDetailRail
        record={record}
        keywords={keywords}
        cacheTtlSeconds={86400}
      />
    )
    expect(screen.getByText('78')).toBeVisible()
    expect(screen.queryByText('22')).not.toBeInTheDocument()
    expect(screen.getByText('한국 · 뉴스')).toBeVisible()
    expect(screen.getByText('캐시 사용 · 24시간')).toBeVisible()
    expect(screen.getByText(/2026.*10.*05.*09:12/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: '키워드와 비교하기' }))
    const nav = screen.getByRole('navigation', { name: '비교할 키워드' })
    expect(within(nav).getByRole('link', { name: '반도체' })).toHaveAttribute(
      'href',
      '/keywords/k2?preview=NVDA'
    )
    await user.keyboard('{Escape}')
    expect(nav).not.toBeInTheDocument()
  })
  it('retains the chooser for unlinked stocks and hides an unconfigured cache', async () => {
    render(
      <StockDetailRail
        record={{ ...record, ticker: 'AAPL' }}
        keywords={keywords}
        cacheTtlSeconds={null}
      />
    )
    expect(screen.getByText(/아직 이 종목에 연결된/)).toBeVisible()
    expect(screen.queryByText(/캐시 사용/)).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: '키워드와 비교하기' })
    )
    expect(
      screen
        .getByRole('navigation', { name: '비교할 키워드' })
        .querySelectorAll('a')
    ).toHaveLength(2)
  })
  it('renders the empty account without dead comparison links', async () => {
    render(
      <StockDetailRail record={record} keywords={[]} cacheTtlSeconds={null} />
    )
    await userEvent.click(
      screen.getByRole('button', { name: '키워드와 비교하기' })
    )
    expect(screen.getByText(/먼저 키워드를 저장/)).toBeVisible()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
