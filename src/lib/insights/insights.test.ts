import { describe, expect, it } from 'vitest'
import type {
  KeywordAnalysisSummary,
  KeywordRecord,
  SearchRecord,
} from '@/types/database'
import {
  interestMetrics,
  interestSignal,
  selectRepresentativeAnalysis,
} from './analysis'
import { stockDisplayMetrics, overlayDeviation } from './stock'
import { keywordInsight, linkedKeywords } from './keywords'
import { createBriefing } from './briefing'
import { completedWeek, isStale } from './calendar'

function analysis(id: string, yoy = 25): KeywordAnalysisSummary {
  return {
    id,
    keyword_id: 'keyword',
    period: '5Y',
    region: 'GLOBAL',
    search_type: 'WEB',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-25T00:00:00Z',
    trends_data: Array.from({ length: 65 }, (_, i) => ({
      date: `week-${i}`,
      value: i < 52 ? 40 : 50,
      ma13Value: null,
      yoyValue: i === 64 ? yoy : null,
    })),
    overlays: [],
  }
}
function keyword(id: string, yoy: number): KeywordRecord {
  return {
    id,
    user_id: 'owner',
    keyword: id,
    region: 'GLOBAL',
    search_type: 'WEB',
    trends_data: [],
    searched_at: '2026-09-01',
    created_at: '2026-09-01',
    updated_at: '2026-09-01',
    analyses: [analysis(id, yoy)],
  }
}
const stock: SearchRecord = {
  id: 'stock',
  user_id: 'owner',
  ticker: 'NVDA',
  company_name: 'Nvidia',
  searched_at: '2026-09-25T00:00:00Z',
  price_data: Array.from({ length: 13 }, (_, i) => ({
    date: `week-${i}`,
    close: i === 12 ? 90 : 100,
  })),
}
const overlay = {
  id: 'overlay',
  analysis_id: 'keyword',
  ticker: 'NVDA',
  company_name: 'Nvidia',
  display_order: 0,
  created_at: '2026-09-01',
  chart_data: stock.price_data.map(point => ({
    date: point.date,
    rawPrice: point.close,
    normalizedPrice: null,
  })),
}

describe('대표 분석과 관심도 표시', () => {
  it('5년 조건만 선택하고 순서·갱신·생성 시각 순으로 결정한다', () => {
    const first = {
      ...analysis('first'),
      display_order: 0,
      updated_at: undefined,
    }
    const recent = {
      ...analysis('recent'),
      display_order: 0,
      updated_at: '2026-10-01',
    }
    expect(
      selectRepresentativeAnalysis([
        { ...analysis('short'), period: '1Y' },
        { ...analysis('later'), display_order: 1 },
        first,
        recent,
      ])?.id
    ).toBe('recent')
    expect(
      selectRepresentativeAnalysis([
        { ...first, created_at: '2026-10-02' },
        { ...first, id: 'older', created_at: '2026-10-01' },
      ])?.id
    ).toBe('first')
    expect(selectRepresentativeAnalysis([])).toBeNull()
  })
  it.each([
    [20, 'surge'],
    [19.99, 'neutral'],
    [-15, 'slowdown'],
    [-14.99, 'neutral'],
    [null, 'neutral'],
  ] as const)('YoY %s 임계값을 %s로 표시한다', (value, signal) => {
    expect(interestSignal(value)).toBe(signal)
  })
  it('65주 미만의 저장된 YoY도 결측으로 표시하며 계산 기준은 유지한다', () => {
    const points = analysis('a').trends_data ?? []
    expect(interestMetrics(points.slice(1)).yoy).toBeNull()
    expect(
      interestMetrics(points.map(point => ({ ...point, yoyValue: null }))).yoy
    ).toBe(25)
    expect(interestMetrics(points).sparkline).toHaveLength(52)
    expect(interestMetrics([])).toMatchObject({
      value: null,
      change: null,
      yoy: null,
    })
  })
})

describe('종목과 연결 키워드', () => {
  it('13·65주 경계와 실제 0을 구분한다', () => {
    expect(stockDisplayMetrics(stock.price_data.slice(1)).deviation).toBeNull()
    expect(stockDisplayMetrics(stock.price_data).deviation).toBeLessThan(0)
    expect(stockDisplayMetrics(stock.price_data).yoy).toBeNull()
    expect(
      stockDisplayMetrics(
        Array.from({ length: 65 }, () => ({ date: 'week', close: 100 }))
      ).yoy
    ).toBe(0)
    expect(stockDisplayMetrics([{ date: 'week', close: 0 }]).change).toBeNull()
  })
  it('비교 종목은 결측 가격을 제외한 13개 평균으로 계산한다', () => {
    expect(overlayDeviation(overlay)).toBeLessThan(0)
    expect(
      overlayDeviation({ ...overlay, chart_data: overlay.chart_data.slice(1) })
    ).toBeNull()
    expect(
      overlayDeviation({
        ...overlay,
        chart_data: [
          ...overlay.chart_data,
          { date: 'missing', rawPrice: null, normalizedPrice: 0 },
        ],
      })
    ).toBe(overlayDeviation(overlay))
  })
  it('관심 상승과 음수 괴리를 조합하고 외 N을 표시한다', () => {
    const input = keyword('chip', 25)
    input.analyses = [
      {
        ...analysis('chip'),
        overlays: [overlay, { ...overlay, id: 'second', ticker: 'AMD' }],
      },
    ]
    expect(keywordInsight(input)).toMatchObject({
      kind: 'divergence',
      tickerLabel: 'AMD 외 1',
      overlayCount: 2,
    })
  })
  it('티커 대소문자를 무시하고 해당 분석의 값으로 연결한다', () => {
    const input = keyword('chip', 25)
    input.analyses = [
      analysis('representative', 90),
      { ...analysis('linked', -40), display_order: 1, overlays: [overlay] },
    ]
    const second = keyword('robot', 30)
    second.analyses = [
      { ...analysis('robot', 30), overlays: [{ ...overlay, ticker: 'nvda' }] },
    ]
    expect(
      linkedKeywords('nvda', [second, input]).map(item => [item.id, item.yoy])
    ).toEqual([
      ['chip', -40],
      ['robot', 30],
    ])
  })
})

describe('브리핑과 날짜 경계', () => {
  it('괴리·급등·둔화 우선순위와 최대 3개를 적용한다', () => {
    const divergent = keyword('divergent', 20)
    divergent.analyses = [{ ...analysis('divergent', 20), overlays: [overlay] }]
    const result = createBriefing({
      stocks: [stock],
      keywords: [
        keyword('slow', -15),
        keyword('surge', 50),
        keyword('other', 30),
        divergent,
        keyword('neutral', 0),
      ],
      now: new Date('2026-10-09T00:00:00Z'),
    })
    expect(result.candidates.map(item => item.id)).toEqual([
      'divergent',
      'surge',
      'other',
    ])
    expect(result.statistics).toEqual({
      average: -10,
      up: 0,
      down: 1,
      surge: 3,
    })
    expect(result.staleStocks).toBe(1)
    expect(result.staleKeywords).toBe(5)
  })
  it('변화 없는 주와 빈 데이터는 가짜 통계를 만들지 않는다', () => {
    const result = createBriefing({
      stocks: [],
      keywords: [keyword('neutral', 0)],
      now: new Date(),
    })
    expect(result.candidates).toEqual([])
    expect(result.statistics.average).toBeNull()
  })
  it('14일 포함, 그 직전 제외와 알 수 없는 날짜를 구분한다', () => {
    const now = new Date('2026-10-09T00:00:00Z')
    expect(isStale('2026-09-25T00:00:00Z', now)).toBe(true)
    expect(isStale('2026-09-25T00:00:00.001Z', now)).toBe(false)
    expect(isStale(null, now)).toBe(false)
    expect(isStale('invalid', now)).toBe(false)
  })
  it('월요일 경계와 ISO 주차 연도를 기존 주 기준으로 표시한다', () => {
    expect(completedWeek(new Date(2026, 9, 4, 23, 59)).key).toBe('2026-09-21')
    expect(completedWeek(new Date(2026, 9, 5)).key).toBe('2026-09-28')
    expect(completedWeek(new Date(2021, 0, 4)).label).toBe('2020년 53주차')
  })
})
