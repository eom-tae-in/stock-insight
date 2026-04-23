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

import {
  calculateMA13,
  calculateTrendsMA13,
  calculateTrendsYoY,
} from './indicators'
import type { PriceDataPoint, Metrics } from '@/types'

// 지표 계산 함수 re-export
export { calculateMA13, calculateTrendsMA13, calculateTrendsYoY }

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

  // YoY: 52주 대비 변화율
  const yoyChange = calculateYoY(priceData)

  return {
    currentPrice,
    previousClose,
    ma13,
    yoyChange,
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
