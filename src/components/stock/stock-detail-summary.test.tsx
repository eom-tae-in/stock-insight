import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StockDetailSummary } from './stock-detail-summary'
import type { SearchRecord } from '@/types'
const record: SearchRecord = {
  id: 'owned-stock',
  user_id: 'owner',
  ticker: 'TEST',
  company_name: 'Test Corporation',
  currency: 'USD',
  searched_at: '2026-10-02T00:00:00Z',
  price_data: [
    { date: '2026-09-21', close: 110 },
    { date: '2026-09-28', close: 100 },
  ],
}
describe('저장된 종목 상세 요약', () => {
  it('실제 저장 가격과 하락 색을 사용하고 부족한 MA13·YoY는 결측으로 표시한다', () => {
    render(<StockDetailSummary record={record} />)
    expect(screen.getByRole('heading', { name: 'TEST' })).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    for (const change of screen.getAllByText('−9.09%')) {
      expect(change).toHaveAttribute('data-change', 'down')
    }
    expect(screen.getByText('전주 대비 · 10.02 주간 종가')).toBeInTheDocument()
    expect(
      screen.getByText('13주 이동평균').parentElement?.parentElement
    ).toHaveTextContent('—')
    expect(
      screen.queryByRole('button', { name: '저장' })
    ).not.toBeInTheDocument()
  })
})
