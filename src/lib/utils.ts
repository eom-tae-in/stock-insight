import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PriceDataPoint } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * F021: 주식 가격 데이터를 Google Trends 범위(0-100)로 정규화
 *
 * min-max 정규화 공식: (value - min) / (max - min) * 100
 * 엣지 케이스: max === min일 때는 50 반환 (중간값)
 *
 * @param priceData - 정규화할 주가 데이터 배열
 * @returns 정규화된 값 배열 (0-100 범위)
 */
export function normalizeToTrendsRange(priceData: PriceDataPoint[]): number[] {
  if (priceData.length === 0) {
    return []
  }

  // close 값들만 추출
  const closeValues = priceData.map(p => p.close)

  // 최소/최대값 구하기
  const min = Math.min(...closeValues)
  const max = Math.max(...closeValues)

  // 정규화
  const range = max - min

  return closeValues.map(value => {
    if (range === 0) {
      // max === min인 경우, 중간값(50) 반환
      return 50
    }
    return Math.round(((value - min) / range) * 100 * 100) / 100
  })
}
