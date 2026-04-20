/**
 * Task 010: Google Trends 데이터 수집 서비스
 *
 * Python Trends 스크립트를 서버에서 직접 실행하여 Google Trends 데이터를
 * 수집합니다.
 * - 검색 키워드: companyName 우선, 실패 시 `${ticker} stock` 폴백
 * - 5년 주간 데이터 수집
 * - 날짜 정규화 (ISO week 기준 → 월요일)
 */

import { fetchInternalTrendsData } from '@/server/trends-internal-service'
import type { TrendsDataPoint } from '@/types'

export interface TrendsDataResult {
  trendsData: TrendsDataPoint[]
  keyword: string
}

/**
 * Python Trends 스크립트 호출
 */
export async function callPyTrendsAPI(
  keyword: string,
  geo: string = '',
  timeframe: string = '5y',
  gprop: string = ''
): Promise<TrendsDataPoint[]> {
  const data = await fetchInternalTrendsData({ keyword, geo, timeframe, gprop })

  if (data.length === 0) {
    throw new Error('No valid trends data points')
  }

  return data.map(point => ({
    date: point.date,
    value: point.value,
    ma13Value: null,
    yoyValue: null,
  }))
}

/**
 * Google Trends 데이터 수집 (pytrends 사용, 폴백 지원)
 *
 * 1차: companyName으로 시도
 * 2차: `${ticker} stock`으로 시도
 */
export async function fetchTrendsData(
  ticker: string,
  companyName: string
): Promise<TrendsDataResult> {
  let lastError: Error | null = null

  // 1차: companyName으로 시도
  // F023 geo/timeframe/gprop은 ticker 기반(F004) 경로에서 미지원 - 기본값 사용
  try {
    const trendsData = await callPyTrendsAPI(companyName)
    return {
      trendsData,
      keyword: companyName,
    }
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error))
    console.warn(`Trends fetch with companyName failed: ${lastError.message}`)
  }

  // 2차: `${ticker} stock`으로 폴백
  const fallbackKeyword = `${ticker} stock`
  try {
    const trendsData = await callPyTrendsAPI(fallbackKeyword)
    return {
      trendsData,
      keyword: fallbackKeyword,
    }
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error))
    console.warn(
      `Trends fetch with fallback keyword failed: ${lastError.message}`
    )
  }

  // 모두 실패
  throw new Error(
    `Failed to fetch trends data for ${ticker} (tried: "${companyName}" and "${fallbackKeyword}")`
  )
}
