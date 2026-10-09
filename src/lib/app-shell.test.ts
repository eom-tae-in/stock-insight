import { describe, expect, it } from 'vitest'
import { createShellData, toShellStock, shellRoute } from './app-shell'
import type { SearchRecord } from '@/types/database'
const record: SearchRecord = {
  id: 'nvda',
  user_id: 'owner',
  ticker: 'NVDA',
  company_name: 'Nvidia',
  current_price: 120,
  previous_close: 100,
  price_data: [],
  searched_at: '2026-09-25T00:00:00Z',
}
describe('셸 표시 데이터', () => {
  it('14일 경계와 완료 주·다음 반영일을 구분한다', () => {
    const result = createShellData(
      [record],
      [],
      false,
      new Date('2026-10-09T00:00:00Z')
    )
    expect(result.staleCount).toBe(1)
    expect(result.week).toBe('2026년 40주차')
    expect(result.weekRange).toBe('09.28 – 10.02')
    expect(result.nextWeek).toBe('10.12(월) 이후')
  })
  it('갱신이 14일 미만이면 미갱신 경고를 세지 않는다', () => {
    expect(
      createShellData([record], [], false, new Date('2026-10-08T23:59:59Z'))
        .staleCount
    ).toBe(0)
  })
  it('시계열과 소유자 정보는 셸 요약에 포함하지 않는다', () => {
    expect(toShellStock(record)).toEqual({
      id: 'nvda',
      ticker: 'NVDA',
      change: 20,
    })
  })
  it('이전 종가가 없거나 0이면 등락은 결측이다', () => {
    expect(toShellStock({ ...record, previous_close: 0 }).change).toBeNull()
    expect(
      toShellStock({ ...record, previous_close: undefined }).change
    ).toBeNull()
  })
  it('저장 종목의 제목과 상위 목록 경로를 사용한다', () => {
    const data = createShellData([record], [], false, new Date('2026-10-09'))
    expect(shellRoute('/stock-analysis/nvda', data)).toEqual({
      parent: '종목 분석',
      href: '/stock-analysis',
      title: 'NVDA',
      detail: true,
    })
  })
})
