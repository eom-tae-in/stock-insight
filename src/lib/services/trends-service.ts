/**
 * Task 010: Google Trends 데이터 수집 서비스
 *
 * SerpAPI를 사용하여 Google Trends 데이터를 수집합니다.
 * - 검색 키워드: companyName 우선, 실패 시 `${ticker} stock` 폴백
 * - 5년 주간 데이터 수집
 * - 날짜 정규화 (일요일 기준 → 월요일)
 */

import { startOfISOWeek, format } from 'date-fns'
import googleTrends from 'google-trends-api'
import type { TrendsDataPoint } from '@/types'

export interface TrendsDataResult {
  trendsData: TrendsDataPoint[]
  keyword: string
}

interface GoogleTrendsTimelineData {
  time: string
  formattedTime: string
  value: number[]
  hasData: boolean[]
}

interface GoogleTrendsResult {
  default?: {
    timelineData: GoogleTrendsTimelineData[]
  }
}

/**
 * Google Trends API 호출 (google-trends-api)
 */
async function callGoogleTrendsAPI(
  keyword: string
): Promise<TrendsDataPoint[]> {
  const startTime = new Date()
  startTime.setFullYear(startTime.getFullYear() - 5)

  const rawResult: string = await googleTrends.interestOverTime({
    keyword,
    startTime,
  })

  const parsed: GoogleTrendsResult = JSON.parse(rawResult)
  const timelineData = parsed?.default?.timelineData

  if (!timelineData || timelineData.length === 0) {
    throw new Error('No trends data available')
  }

  // 데이터 정규화
  const trendsData: TrendsDataPoint[] = []

  for (const item of timelineData) {
    // timestamp 기반 날짜 정규화
    const timestamp = parseInt(item.time, 10)
    if (isNaN(timestamp)) continue

    const date = new Date(timestamp * 1000)
    const normalizedDate = startOfISOWeek(date)
    const dateStr = format(normalizedDate, 'yyyy-MM-dd')

    // 값 추출 (0-100 범위)
    let value = 0
    if (item.value && item.value.length > 0) {
      value = item.value[0] ?? 0
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
