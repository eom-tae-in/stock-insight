/**
 * 기술 지표 계산 모듈
 *
 * Task 011: 지표 계산 로직
 * - MA13 (13주 이동평균)
 * - 13주 이동평균 기준 전년동기 대비 증감률 (52주 YoY)
 * - 52주 최고/최저가
 * - 종합 지표 계산
 * - 가격-트렌드 데이터 매칭
 */

import {
  calculateMA13,
  calculateTrendsMA13,
  calculateTrendsYoY,
} from './indicators'
import type { PriceDataPoint, Metrics } from '@/types'

// 지표 계산 함수 re-export
export { calculateMA13, calculateTrendsMA13, calculateTrendsYoY }

/**
 * 13주 이동평균 기준 52주 YoY 계산
 * 최신 13주 이동평균과 52주 전 같은 시점의 13주 이동평균을 비교합니다.
 */
export function calculateYoY(priceData: PriceDataPoint[]): number {
  if (priceData.length === 0) return 0

  const ma13Values = calculateMA13(priceData)
  const currentMA13 = ma13Values[ma13Values.length - 1]
  const week52AgoMA13 = ma13Values[ma13Values.length - 1 - 52]

  if (currentMA13 == null || week52AgoMA13 == null || week52AgoMA13 === 0) {
    return 0
  }

  const yoyChange = ((currentMA13 - week52AgoMA13) / week52AgoMA13) * 100
  return Math.round(yoyChange * 100) / 100
}

/**
 * 지난주 OHLC 데이터 추출
 */
export function getWeeklyOHLC(priceData: PriceDataPoint[]): {
  open: number
  high: number
  low: number
  close: number
} {
  if (priceData.length === 0) {
    return { open: 0, high: 0, low: 0, close: 0 }
  }

  const lastWeek = priceData[priceData.length - 1]
  return {
    open: lastWeek.open || 0,
    high: lastWeek.high || 0,
    low: lastWeek.low || 0,
    close: lastWeek.close,
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
    }
  }

  const currentPrice = priceData[priceData.length - 1].close
  const previousClose = priceData[priceData.length - 2]?.close || currentPrice

  // MA13: 최근 13주 이동평균 (배열의 마지막 값)
  const ma13Array = calculateMA13(priceData)
  const ma13 = ma13Array[ma13Array.length - 1] || 0

  // 13주 이동평균 기준 전년동기 대비 증감률(52주 YoY)
  const yoyChange = calculateYoY(priceData)

  return {
    currentPrice,
    previousClose,
    ma13,
    yoyChange,
  }
}

/**
 * 주별 13주 이동평균 기준 52주 YoY 계산
 * 각 주차별로 해당 시점의 13주 이동평균과 52주 전의 13주 이동평균을 비교합니다.
 * 13주 이동평균 또는 52주 전 비교값이 없으면 null을 반환합니다.
 */
export function calculateWeeklyYoY(
  priceData: PriceDataPoint[]
): (number | null)[] {
  if (priceData.length === 0) return []

  const ma13Values = calculateMA13(priceData)

  return ma13Values.map((currentMA13, index) => {
    const week52AgoIndex = index - 52
    const week52AgoMA13 =
      week52AgoIndex >= 0 ? ma13Values[week52AgoIndex] : null

    if (currentMA13 == null || week52AgoMA13 == null || week52AgoMA13 === 0) {
      return null
    }

    const yoyChange = ((currentMA13 - week52AgoMA13) / week52AgoMA13) * 100
    return Math.round(yoyChange * 100) / 100
  })
}
