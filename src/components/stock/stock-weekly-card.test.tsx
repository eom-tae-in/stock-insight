import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StockWeeklyCard } from './stock-weekly-card'
import { generateTableExcelFile } from '@/lib/export'
import type { SearchRecord } from '@/types'

vi.mock('@/lib/export', () => ({ generateTableExcelFile: vi.fn() }))
const record: SearchRecord = {
  id: 'owned-stock',
  user_id: 'owner',
  ticker: 'NVDA',
  company_name: 'NVIDIA Corporation',
  currency: 'USD',
  searched_at: '2026-10-02T00:00:00Z',
  price_data: Array.from({ length: 65 }, (_, index) => ({
    date: new Date(Date.UTC(2025, 0, 6 + index * 7)).toISOString().slice(0, 10),
    close: index + 100,
    open: index + 99,
    high: index + 102,
    low: index + 98,
    volume: 1000000,
  })),
}

describe('종목 주간 데이터 카드', () => {
  beforeEach(() => vi.mocked(generateTableExcelFile).mockReset())

  it('전체 이력으로 계산한 지표와 최근 6주를 최신순으로 표시한다', () => {
    render(<StockWeeklyCard record={record} />)
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(7)
    const latest = within(rows[1]).getAllByRole('cell')
    expect(latest).toHaveLength(9)
    expect(latest[0].querySelector('time')).toHaveAttribute(
      'dateTime',
      '2026-03-30'
    )
    expect(latest[4]).toHaveTextContent('$164.00')
    expect(latest[5]).toHaveTextContent('+0.61%')
    expect(latest[6]).toHaveTextContent('1M')
    expect(latest[7]).toHaveTextContent('$158.00')
    expect(latest[8]).toHaveTextContent('+49.06%')
    expect(rows[2].lastElementChild).toHaveTextContent('—')
    expect(rows[6].querySelector('time')).toHaveAttribute(
      'dateTime',
      '2026-02-23'
    )
    expect(screen.getByRole('link', { name: '전체 보기' })).toHaveAttribute(
      'href',
      '/stock-analysis/owned-stock/table'
    )
  })

  it('Excel에는 표시한 6주가 아닌 전체 이력과 기존 지표를 전달한다', async () => {
    const user = userEvent.setup()
    render(<StockWeeklyCard record={record} />)
    await user.click(screen.getByRole('button', { name: /Excel로 다운로드/ }))
    const [ticker, rows] = vi.mocked(generateTableExcelFile).mock.calls[0]
    expect(ticker).toBe('NVDA')
    expect(rows).toHaveLength(65)
    expect(rows[0]).toEqual({
      date: '2025-01-06',
      close: 100,
      trends: 0,
      ma13: null,
      yoy: null,
    })
    expect(rows[12].ma13).toBe(106)
    expect(rows[64]).toEqual({
      date: '2026-03-30',
      close: 164,
      trends: 0,
      ma13: 158,
      yoy: 49.06,
    })
  })

  it('첫 주와 0 기준 등락 및 없는 OHLC·거래량·지표는 결측이다', () => {
    render(
      <StockWeeklyCard
        record={{
          ...record,
          price_data: [
            { date: '2020-12-28', close: 0 },
            { date: '2021-01-04', close: 100 },
          ],
        }}
      />
    )
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    const cells = within(rows[1]).getAllByRole('cell')
    for (const index of [1, 2, 3, 5, 6, 7, 8])
      expect(cells[index]).toHaveTextContent('—')
    expect(within(rows[2]).getAllByRole('cell')[5]).toHaveTextContent('—')
    expect(rows[2].querySelector('time')).toHaveAttribute(
      'aria-label',
      '2020년 53주차'
    )
  })

  it('주간 데이터가 없으면 내보내기를 비활성화하고 안내를 표시한다', () => {
    render(<StockWeeklyCard record={{ ...record, price_data: [] }} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Excel로 다운로드/ })
    ).toBeDisabled()
    expect(screen.getByText(/저장된 주간 데이터가 없어요/)).toBeInTheDocument()
  })

  it('Excel 생성 실패를 관련 카드에 표시해 재시도할 수 있다', async () => {
    vi.mocked(generateTableExcelFile).mockImplementationOnce(() => {
      throw new Error('파일 생성 오류')
    })
    const user = userEvent.setup()
    render(<StockWeeklyCard record={record} />)
    const download = screen.getByRole('button', { name: /Excel로 다운로드/ })
    await user.click(download)
    expect(screen.getByRole('alert')).toHaveTextContent('파일 생성 오류')
    await user.click(download)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(generateTableExcelFile).toHaveBeenCalledTimes(2)
  })
})
