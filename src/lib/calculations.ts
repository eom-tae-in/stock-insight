/**
 * 기술 지표 계산 모듈
 *
 * Task 011: 지표 계산 로직
 * - MA13 (13주 이동평균)
 * - YoY (52주 대비 변화율)
 * - 52주 최고/최저가
 * - 종합 지표 계산
 * - 가격-트렌드 데이터 매칭
 */

import { calculateMA13 } from './indicators'
import type { PriceDataPoint, TrendsDataPoint, Metrics } from '@/types'

// MA13 re-export
export { calculateMA13 }

/**
 * YoY(Year over Year) 계산
 * 52주 전 종가 대비 현재 종가의 변화율 (%)
 */
export function calculateYoY(priceData: PriceDataPoint[]): number {
  if (priceData.length === 0) return 0

  const currentPrice = priceData[priceData.length - 1].close
  const week52AgoIndex = Math.max(0, priceData.length - 52)
  const week52AgoPrice = priceData[week52AgoIndex].close

  if (week52AgoPrice === 0) return 0

  const yoyChange = ((currentPrice - week52AgoPrice) / week52AgoPrice) * 100
  return Math.round(yoyChange * 100) / 100
}

/**
 * 52주 최고가/최저가 계산
 * 최근 52주 데이터에서 최고가와 최저가를 추출합니다.
 * high/low 필드가 없으면 close를 사용합니다.
 */
export function calculate52WeekHighLow(priceData: PriceDataPoint[]): {
  high: number
  low: number
} {
  if (priceData.length === 0) {
    return { high: 0, low: 0 }
  }

  const week52Data = priceData.slice(Math.max(0, priceData.length - 52))
  const high = Math.max(...week52Data.map(p => p.high || p.close))
  const low = Math.min(...week52Data.map(p => p.low || p.close))

  return {
    high: Math.round(high * 100) / 100,
    low: Math.round(low * 100) / 100,
  }
}

/**
 * 모든 기술 지표 계산
 */
export function calculateMetrics(priceData: PriceDataPoint[]): Metrics {
  if (priceData.length === 0) {
    return {
      currentPrice: 0,
      previousClose: 0,
      ma13: 0,
      yoyChange: 0,
      week52High: 0,
      week52Low: 0,
    }
  }

  const currentPrice = priceData[priceData.length - 1].close
  const previousClose = priceData[priceData.length - 2]?.close || currentPrice

  // MA13: 최근 13주 이동평균 (배열의 마지막 값)
  const ma13Array = calculateMA13(priceData)
  const ma13 = ma13Array[ma13Array.length - 1] || 0

  // YoY: 52주 대비 변화율
  const yoyChange = calculateYoY(priceData)

  // 52주 최고/최저
  const { high: week52High, low: week52Low } = calculate52WeekHighLow(priceData)

  return {
    currentPrice,
    previousClose,
    ma13,
    yoyChange,
    week52High,
    week52Low,
  }
}

/**
 * 주별 YoY(Year over Year) 계산
 * 각 주차별로 52주 전 종가 대비 변화율을 배열로 반환합니다.
 * 52주 미만의 데이터는 0으로 채웁니다.
 */
export function calculateWeeklyYoY(priceData: PriceDataPoint[]): number[] {
  if (priceData.length === 0) return []

  return priceData.map((point, index) => {
    const week52AgoIndex = index - 52

    if (week52AgoIndex < 0) {
      return 0
    }

    const week52AgoPrice = priceData[week52AgoIndex].close
    if (week52AgoPrice === 0) return 0

    const yoyChange = ((point.close - week52AgoPrice) / week52AgoPrice) * 100
    return Math.round(yoyChange * 100) / 100
  })
}

/**
 * 가격 데이터와 트렌드 데이터를 날짜 기준으로 매칭
 * 이미 두 데이터 모두 startOfISOWeek로 정규화되어 있어 직접 매칭 가능
 * 비교 차트(ComparisonChart)용으로 사용됩니다.
 */
export function matchPriceAndTrends(
  priceData: PriceDataPoint[],
  trendsData: TrendsDataPoint[]
): Array<{ date: string; price: number; trend: number }> {
  // 트렌드 데이터를 날짜 기준으로 매핑
  const trendsMap = new Map<string, number>()
  for (const point of trendsData) {
    trendsMap.set(point.date, point.value)
  }

  // 양쪽 데이터가 모두 있는 날짜만 결합
  const result: Array<{ date: string; price: number; trend: number }> = []

  for (const point of priceData) {
    const trend = trendsMap.get(point.date)

    if (trend !== undefined) {
      result.push({
        date: point.date,
        price: point.close,
        trend,
      })
    }
  }

  return result
}
