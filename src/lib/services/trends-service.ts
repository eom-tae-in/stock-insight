/**
 * Task 010: Google Trends 데이터 수집 서비스
 *
 * pytrends를 사용하여 Google Trends 데이터를 수집합니다.
 * - Python 스크립트 (src/lib/get_trends.py) 호출 via child_process
 * - 검색 키워드: companyName 우선, 실패 시 `${ticker} stock` 폴백
 * - 5년 주간 데이터 수집
 * - 날짜 정규화 (ISO week 기준 → 월요일)
 */

import { startOfISOWeek, format } from 'date-fns'
import { execFileSync } from 'child_process'
import path from 'path'
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
 * pytrends Python 스크립트 호출 (F023: geo, timeframe, gprop 파라미터 지원)
 */
export function callPyTrendsAPI(
  keyword: string,
  geo: string = '',
  timeframe: string = '5y',
  gprop: string = ''
): TrendsDataPoint[] {
  try {
    const pythonPath = path.join(process.cwd(), 'venv', 'bin', 'python3')
    const scriptPath = path.join(process.cwd(), 'src', 'lib', 'get_trends.py')

    const result = execFileSync(
      pythonPath,
      [scriptPath, keyword, geo, timeframe, gprop],
      {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB 버퍼
        timeout: 30_000, // 30초 상한 (pytrends 응답 지연 방어)
      }
    )

    const pyData: PyTrendsDataPoint[] = JSON.parse(result)

    if (!pyData || pyData.length === 0) {
      throw new Error('No trends data available')
    }

    // 데이터 정규화 및 변환
    const trendsData: TrendsDataPoint[] = []

    for (const item of pyData) {
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
      throw new Error('No valid trends data points')
    }

    return trendsData
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse Python script output: ${error.message}`)
    }
    throw error
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
    const trendsData = callPyTrendsAPI(companyName)
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
    const trendsData = callPyTrendsAPI(fallbackKeyword)
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
