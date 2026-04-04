/**
 * Task 010: Google Trends 데이터 수집 서비스
 *
 * Vercel Python Serverless Function (api/trends.py)을 호출하여
 * Google Trends 데이터를 수집합니다.
 * - 검색 키워드: companyName 우선, 실패 시 `${ticker} stock` 폴백
 * - 5년 주간 데이터 수집
 * - 날짜 정규화 (ISO week 기준 → 월요일)
 */

import { startOfISOWeek, format } from 'date-fns'
import type { TrendsDataPoint } from '@/types'

export interface TrendsDataResult {
  trendsData: TrendsDataPoint[]
  keyword: string
}

interface PyTrendsDataPoint {
  date: string
  value: number
}


/**
 * Python Trends API 호출
 * - 로컬: http://localhost:5000/api/trends (Flask)
 * - Vercel: https://{project}.vercel.app/api/trends (Serverless Function)
 *
 * API URL과 타임아웃은 환경 변수에서 관리
 */
export async function callPyTrendsAPI(
  keyword: string,
  geo: string = '',
  timeframe: string = '5y',
  gprop: string = ''
): Promise<TrendsDataPoint[]> {
  // 환경 변수에서 API URL 가져오기
  const apiUrl = process.env.TRENDS_API_URL

  if (!apiUrl) {
    throw new Error('TRENDS_API_URL environment variable is not configured')
  }

  // 타임아웃 설정 (환경 변수에서, 기본값 30초)
  const timeout = process.env.TRENDS_API_TIMEOUT
    ? parseInt(process.env.TRENDS_API_TIMEOUT, 10)
    : 30_000

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyword,
        geo,
        timeframe,
        gprop,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Trends API returned ${response.status}`)
    }

    // 응답 형식: { success: boolean, data?: [...], error?: string, code?: string }
    const jsonResponse = await response.json()

    if (typeof jsonResponse !== 'object' || jsonResponse === null) {
      throw new Error('Invalid API response format')
    }

    const { success, data, error } = jsonResponse

    if (!success) {
      throw new Error(error || 'Trends API request failed')
    }

    if (!Array.isArray(data)) {
      throw new Error('Invalid trends data format: data is not an array')
    }

    if (data.length === 0) {
      return []
    }

    // 데이터 정규화 및 변환
    const trendsData: TrendsDataPoint[] = []

    for (const item of data) {
      if (typeof item.date !== 'string' || typeof item.value !== 'number') {
        console.warn('Skipping invalid data point:', item)
        continue
      }

      // 문자열 날짜를 Date 객체로 변환
      const date = new Date(item.date)
      const normalizedDate = startOfISOWeek(date)
      const dateStr = format(normalizedDate, 'yyyy-MM-dd')

      // 값 범위 확인 (0-100)
      const value = Math.max(0, Math.min(100, Math.round(item.value)))

      // 중복 날짜 제거
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
      throw new Error('No valid trends data points after normalization')
    }

    return trendsData
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Trends API timeout (${timeout}ms exceeded)`)
      }
      throw error
    }

    throw new Error('Unknown error in trends API call')
  }
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
