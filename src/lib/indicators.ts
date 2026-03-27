import type { PriceDataPoint } from '@/types'

/**
 * 13주 이동평균 계산 (전체 시계열)
 *
 * 13개 미만의 데이터 구간에서는 null을 반환합니다.
 * 이는 기술 지표의 표준 동작입니다.
 */
export function calculateMA13(priceData: PriceDataPoint[]): (number | null)[] {
  const ma13Values: (number | null)[] = []

  for (let i = 0; i < priceData.length; i++) {
    // 13개 미만이면 null (MA13은 13개 이상 필요)
    if (i < 12) {
      ma13Values.push(null)
      continue
    }

    const window = priceData.slice(i - 12, i + 1)
    const sum = window.reduce((acc, point) => acc + point.close, 0)
    const average = sum / window.length
    ma13Values.push(Math.round(average * 100) / 100)
  }

  return ma13Values
}
