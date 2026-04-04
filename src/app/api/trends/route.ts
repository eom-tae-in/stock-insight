/**
 * Google Trends 데이터 수집 API Route
 * GET /api/trends?keyword=...
 *
 * ma13Value, yoyValue 계산을 서버에서 수행하여 응답에 포함
 */

import { NextRequest } from 'next/server'
import { callPyTrendsAPI } from '@/lib/services/trends-service'
import { calculateTrendsMA13 } from '@/lib/indicators'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'
import type { TrendsDataPoint } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const keyword = request.nextUrl.searchParams.get('keyword')
    const geo = request.nextUrl.searchParams.get('geo') ?? ''
    const timeframe = request.nextUrl.searchParams.get('timeframe') ?? '5y'
    const gprop = request.nextUrl.searchParams.get('gprop') ?? ''

    if (!keyword) {
      return createErrorResponse('INVALID_KEYWORD', '키워드를 입력하세요.', 400)
    }

    const trimmedKeyword = keyword.trim()
    if (!trimmedKeyword || trimmedKeyword.length > 100) {
      return createErrorResponse(
        'INVALID_KEYWORD',
        '1~100자의 유효한 키워드를 입력하세요.',
        400
      )
    }

    try {
      const rawTrendsData = await callPyTrendsAPI(
        trimmedKeyword,
        geo,
        timeframe,
        gprop
      )

      // 13주 이동평균 계산
      const ma13Values = calculateTrendsMA13(rawTrendsData)

      // 각 포인트별 52주 YoY 계산
      const weeksInYear = 52
      const yoyValuesArray = rawTrendsData.map((point, idx) => {
        if (idx < weeksInYear) return null
        const currentValue = point.value
        const previousYearValue = rawTrendsData[idx - weeksInYear].value
        if (previousYearValue === 0) return null
        const yoy =
          ((currentValue - previousYearValue) / previousYearValue) * 100
        return Math.round(yoy * 100) / 100
      })

      // 최종 응답 데이터 (ma13Value, yoyValue 포함)
      const trendsData: TrendsDataPoint[] = rawTrendsData.map((point, idx) => ({
        date: point.date,
        value: point.value,
        ma13Value: ma13Values[idx] ?? null,
        yoyValue: yoyValuesArray[idx] ?? null,
      }))

      return createSuccessResponse(
        {
          trendsData,
          keyword: trimmedKeyword,
        },
        200
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(
        `Keyword trends fetch failed for "${trimmedKeyword}":`,
        error
      )
      return createErrorResponse(
        'TRENDS_FETCH_FAILED',
        '트렌드 데이터를 가져오지 못했습니다. 다른 키워드로 시도해주세요.',
        502,
        { message, keyword: trimmedKeyword }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Trends data fetch error:', error)
    return createErrorResponse(
      'TRENDS_FETCH_FAILED',
      '트렌드 데이터를 가져오지 못했습니다. 나중에 다시 시도해주세요.',
      502,
      { message }
    )
  }
}
