/**
 * Task 010: Google Trends 데이터 수집 서비스
 *
 * SerpAPI를 사용하여 Google Trends 데이터를 수집합니다.
 * - 검색 키워드: companyName 우선, 실패 시 `${ticker} stock` 폴백
 * - 5년 주간 데이터 수집
 * - 날짜 정규화 (일요일 기준 → 월요일)
 */

import { startOfISOWeek, format } from 'date-fns'
import { env } from '@/lib/env'
import type { TrendsDataPoint } from '@/types'

export interface TrendsDataResult {
  trendsData: TrendsDataPoint[]
  keyword: string
}

interface SerpAPITimelineData {
  date: string
  timestamp: string
  values: Array<{ query: string; value: string; extracted_value: number }>
}

interface SerpAPIResponse {
  search_metadata?: {
    status: string
  }
  interest_over_time?: SerpAPITimelineData[]
  error?: string
}

/**
 * SerpAPI Google Trends API 호출
 */
async function callGoogleTrendsAPI(
  keyword: string
): Promise<TrendsDataPoint[]> {
  const params = new URLSearchParams({
    engine: 'google_trends',
    q: keyword,
    date: 'today 5-y',
    data_type: 'TIMESERIES',
    api_key: env.SERPAPI_KEY,
  })

  const url = `https://serpapi.com/search.json?${params.toString()}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`SerpAPI request failed: ${response.statusText}`)
  }

  const data: SerpAPIResponse = await response.json()

  // API 에러 확인
  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`)
  }

  // interest_over_time 데이터가 없으면 실패
  if (!data.interest_over_time || data.interest_over_time.length === 0) {
    throw new Error('No trends data available')
  }

  // 데이터 정규화
  const trendsData: TrendsDataPoint[] = []

  for (const item of data.interest_over_time) {
    // timestamp 기반 날짜 정규화
    const timestamp = parseInt(item.timestamp, 10)
    if (isNaN(timestamp)) continue

    const date = new Date(timestamp * 1000)
    const normalizedDate = startOfISOWeek(date)
    const dateStr = format(normalizedDate, 'yyyy-MM-dd')

    // 값 추출 (extracted_value를 사용하고, 없으면 value 문자열 파싱)
    let value = 0
    if (item.values && item.values.length > 0) {
      const firstValue = item.values[0]
      value = firstValue.extracted_value ?? parseInt(firstValue.value, 10)
    }

    // 0-100 범위 확인 및 반올림
    value = Math.max(0, Math.min(100, Math.round(value)))

    // 중복 날짜 제거 (중복이 있으면 마지막 값 사용)
    const existingIndex = trendsData.findIndex(p => p.date === dateStr)

    const point: TrendsDataPoint = {
      date: dateStr,
      value,
    }

    if (existingIndex >= 0) {
      trendsData[existingIndex] = point
    } else {
      trendsData.push(point)
    }
  }

  // 날짜 정렬
  trendsData.sort((a, b) => a.date.localeCompare(b.date))

  if (trendsData.length === 0) {
    throw new Error('No valid trends data points')
  }

  return trendsData
}

/**
 * Google Trends 데이터 수집 (폴백 지원)
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
  try {
    const trendsData = await callGoogleTrendsAPI(companyName)
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
    const trendsData = await callGoogleTrendsAPI(fallbackKeyword)
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
