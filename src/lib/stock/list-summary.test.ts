import { describe, expect, it } from 'vitest'
import { linkedStockInterests, stockListMetrics } from './list-summary'
import type { KeywordRecord, SearchRecord } from '@/types'

const keyword: KeywordRecord = {
  id: 'k1',
  user_id: 'u1',
  keyword: 'AI',
  region: 'GLOBAL',
  search_type: 'WEB',
  trends_data: [],
  searched_at: '2026-10-02',
  created_at: '2026-10-02',
  updated_at: '2026-10-02',
  analyses: [
    {
      id: 'a1',
      keyword_id: 'k1',
      period: '5Y',
      region: 'GLOBAL',
      search_type: 'WEB',
      trends_data: [
        { date: '2026-10-02', value: 78, ma13Value: null, yoyValue: null },
      ],
      overlays: [
        {
          id: 'o1',
          analysis_id: 'a1',
          ticker: 'NVDA',
          company_name: 'NVIDIA',
          display_order: 0,
          created_at: '2026-10-02',
        },
      ],
    },
  ],
}

describe('stock list summaries', () => {
  it('연결된 5년 분석의 실제 관심도만 표시하고 다른 기간은 제외한다', () => {
    const analyses = keyword.analyses ?? []
    const other = analyses.map(a => ({ ...a, id: 'a2', period: '1Y' as const }))
    expect(
      linkedStockInterests([{ ...keyword, analyses: [...other, ...analyses] }])
    ).toEqual({
      NVDA: { keywordId: 'k1', keyword: 'AI', value: 78, yoy: null, count: 1 },
    })
    expect(linkedStockInterests([{ ...keyword, analyses: other }])).toEqual({})
  })
  it('같은 키워드의 여러 조건은 중복 집계하지 않고 다른 키워드는 개수로 표시한다', () => {
    expect(
      linkedStockInterests([keyword, { ...keyword, id: 'k2', keyword: 'GPU' }])
        .NVDA?.count
    ).toBe(2)
    expect(
      linkedStockInterests([
        {
          ...keyword,
          analyses: [...(keyword.analyses ?? []), ...(keyword.analyses ?? [])],
        },
      ]).NVDA?.count
    ).toBe(1)
  })
  it('가격이 없거나 13주/65주가 부족할 때 0%로 만들지 않는다', () => {
    const stock: SearchRecord = {
      id: 's1',
      user_id: 'u1',
      ticker: 'AAPL',
      company_name: 'Apple',
      searched_at: '2026-10-02',
      price_data: [],
    }
    expect(stockListMetrics(stock)).toMatchObject({
      current: null,
      change: null,
      deviation: null,
      yoy: null,
    })
    expect(
      stockListMetrics({ ...stock, current_price: 110, previous_close: 100 })
    ).toMatchObject({ current: 110, change: 10, deviation: null, yoy: null })
  })
})
