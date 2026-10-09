import { renderToString } from 'react-dom/server'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { StockListRow } from './stock-list-row'
import type { SearchRecord } from '@/types'

const record: SearchRecord = {
  id: 's1',
  user_id: 'u1',
  ticker: 'AAPL',
  company_name: 'Apple Inc.',
  currency: 'USD',
  current_price: 90,
  previous_close: 100,
  price_data: [],
  searched_at: '2026-10-02T00:00:00Z',
}
const props = {
  record,
  managing: false,
  selected: false,
  busy: false,
  onRefresh: vi.fn(),
  onDelete: vi.fn(),
}

const renderRow = (row: ReactNode) =>
  render(
    <table>
      <tbody>{row}</tbody>
    </table>
  )

describe('StockListRow', () => {
  it('서버 렌더링은 메뉴 버튼을 유지하고 불안정한 팝업 ID를 만들지 않는다', () => {
    const html = renderToString(
      <table>
        <tbody>
          <StockListRow {...props} />
        </tbody>
      </table>
    )
    expect(html).toContain('aria-label="AAPL 작업"')
    expect(html).toContain('disabled=""')
    expect(html).not.toContain('radix-')
    expect(html).not.toContain('aria-controls=')
  })
  it('별도 상세 링크와 음수 파랑 표시를 제공하며 자료 부족을 표시한다', () => {
    renderRow(<StockListRow {...props} />)
    expect(
      screen.getByRole('link', { name: 'AAPL 상세 보기' })
    ).toHaveAttribute('href', '/stock-analysis/s1')
    expect(screen.getAllByText('−10.00%')[0]).toHaveClass('text-down')
    expect(screen.getByText('$90.00')).toBeInTheDocument()
    expect(screen.getByText('연결 없음')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
  it('작업 메뉴의 갱신과 삭제가 상세 링크 이동과 분리되어 있다', async () => {
    const user = userEvent.setup()
    const refresh = vi.fn()
    renderRow(<StockListRow {...props} onRefresh={refresh} />)
    await user.click(screen.getByRole('button', { name: 'AAPL 작업' }))
    await user.click(screen.getByRole('menuitem', { name: '최신화' }))
    expect(refresh).toHaveBeenCalledOnce()
  })
  it('편집 중에는 상세 링크와 갱신 메뉴를 차단한다', () => {
    renderRow(<StockListRow {...props} managing />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'AAPL 작업' })).toBeDisabled()
  })
})
