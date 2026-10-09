import { describe, expect, it } from 'vitest'
import { calculateMetrics } from '@/lib/calculations'
import { stockDetailSummary } from './detail-summary'

describe('종목 상세 표시 요약', () => {
  it('기존 계산과 MA13·YoY를 일치시키고 주간 고저·거래량·최고점을 표시한다', () => {
    const points = Array.from({ length: 80 }, (_, index) => ({
      date: `2025-${index}`,
      close: index + 20,
      high: index + 25,
      low: index + 15,
      volume: 100 + index,
    }))
    const summary = stockDetailSummary(points)
    expect(summary.ma13).toBe(calculateMetrics(points).ma13)
    expect(summary.yoy).toBe(calculateMetrics(points).yoyChange)
    expect(summary.highestDate).toBe(points[79].date)
    expect(summary.highestChange).toBe(0)
    expect(summary.difference).toBe(1)
    expect(summary.rangePercent).toBeCloseTo((10 / 94) * 100)
    expect(summary.volumeChange).toBeCloseTo((1 / 178) * 100)
  })
  it('13주·65주 미만과 없는 고저·거래량을 0 대신 결측으로 유지한다', () => {
    const summary = stockDetailSummary([{ date: '2026-09-28', close: 10 }])
    expect(summary.ma13).toBeNull()
    expect(summary.yoy).toBeNull()
    expect(summary.rangePercent).toBeNull()
    expect(summary.volumeChange).toBeNull()
    expect(summary.difference).toBeNull()
    expect(stockDetailSummary([]).highestDate).toBeNull()
  })
})
