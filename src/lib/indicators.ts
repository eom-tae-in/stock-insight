import type { PriceDataPoint } from '@/types'

/**
 * 13주 이동평균 계산 (전체 시계열)
 */
export function calculateMA13(priceData: PriceDataPoint[]): number[] {
  const ma13Values: number[] = []

  for (let i = 0; i < priceData.length; i++) {
    const start = Math.max(0, i - 12)
    const window = priceData.slice(start, i + 1)
    const sum = window.reduce((acc, point) => acc + point.close, 0)
    const average = sum / window.length
    ma13Values.push(Math.round(average * 100) / 100)
  }

  return ma13Values
}
