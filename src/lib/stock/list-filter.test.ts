import { describe, expect, it } from 'vitest'
import type { SearchRecord } from '@/types'
import { stockFilterSummary } from './list-filter'

const stock = (
  ticker: string,
  current?: number,
  previous?: number
): SearchRecord => ({
  id: ticker,
  user_id: 'u1',
  ticker,
  company_name: ticker === 'MSFT' ? 'Microsoft Corporation' : ticker,
  current_price: current,
  previous_close: previous,
  price_data: [],
  searched_at: '2026-10-02',
})

describe('stock list filter', () => {
  it('검색과 등락 필터는 사용자 순서를 유지하고 0·결측을 상승/하락에서 제외한다', () => {
    const records = [
      stock('MSFT', 90, 100),
      stock('AAPL', 110, 100),
      stock('FLAT', 100, 100),
      stock('MISSING'),
    ]
    const result = stockFilterSummary(records, '')
    expect(result.all.map(r => r.ticker)).toEqual([
      'MSFT',
      'AAPL',
      'FLAT',
      'MISSING',
    ])
    expect(result.up.map(r => r.ticker)).toEqual(['AAPL'])
    expect(result.down.map(r => r.ticker)).toEqual(['MSFT'])
    expect(
      stockFilterSummary(records, '  microsoft ').all.map(r => r.ticker)
    ).toEqual(['MSFT'])
    expect(stockFilterSummary(records, 'aapl').down).toEqual([])
  })
  it('요약 필드가 없으면 표시 함수와 같은 최근 종가를 기준으로 필터링한다', () => {
    const record = {
      ...stock('AAPL'),
      price_data: [
        { date: '2026-09-25', close: 100 },
        { date: '2026-10-02', close: 110 },
      ],
    }
    expect(stockFilterSummary([record], '').up).toEqual([record])
  })
})
