import type { PriceDataPoint, TrendsDataPoint } from '@/types'

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

/**
 * F018: 트렌드 지수 기반 13주 이동평균 계산
 *
 * 키워드 기반 Google Trends 데이터(value: 0~100)의 13주 이동평균
 * 13개 미만의 데이터 구간에서는 null을 반환합니다.
 */
export function calculateTrendsMA13(
  trendsData: TrendsDataPoint[]
): (number | null)[] {
  const ma13Values: (number | null)[] = []

  for (let i = 0; i < trendsData.length; i++) {
    // 13개 미만이면 null
    if (i < 12) {
      ma13Values.push(null)
      continue
    }

    const window = trendsData.slice(i - 12, i + 1)
    const sum = window.reduce((acc, point) => acc + point.value, 0)
    const average = sum / window.length
    ma13Values.push(Math.round(average * 100) / 100)
  }

  return ma13Values
}

/**
 * F019: 트렌드 지수 기반 13주 이동평균 기준 52주 YoY 변화율 계산
 *
 * 최근 주(마지막 데이터)의 MA13 값과 52주(약 1년) 전 같은 시점의 MA13 값을 비교합니다.
 * 52주 이전 데이터가 없으면 null 반환
 *
 * @param precomputedMA13 - 선택적 사전계산된 MA13 값 (중복 계산 방지)
 * @returns 13주 이동평균 기준 전년동기 대비 증감률 (%)
 */
export function calculateTrendsYoY(
  trendsData: TrendsDataPoint[],
  precomputedMA13?: (number | null)[]
): number | null {
  // 사전계산된 값이 있으면 사용, 없으면 계산 (Medium: 중복 계산 방지)
  const ma13Values = precomputedMA13 ?? calculateTrendsMA13(trendsData)

  // 최소 65주 필요 (13주 + 52주)
  if (ma13Values.length < 65) {
    return null
  }

  // 현재(최신) 시점의 MA13 (마지막 값, null이 아님)
  const currentMA = ma13Values[ma13Values.length - 1]
  if (currentMA === null) {
    return null
  }

  // 52주 전의 MA13 (index = length - 1 - 52)
  const pastMA = ma13Values[ma13Values.length - 1 - 52]
  if (pastMA === null) {
    return null
  }

  // 13주 이동평균 기준 52주 YoY 계산: ((현재 MA13 - 과거 MA13) / 과거 MA13) * 100
  if (pastMA === 0) {
    return null
  }

  const yoy = ((currentMA - pastMA) / pastMA) * 100
  return Math.round(yoy * 100) / 100
}
