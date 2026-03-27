/**
 * Task 010: Google Trends 데이터 수집 API Route
 *
 * GET /api/trends?ticker=AAPL&companyName=Apple+Inc.
 * Response: ApiResponse<{ trendsData, keyword }>
 */

import { NextRequest } from 'next/server'
import { fetchTrendsData } from '@/lib/services/trends-service'
import { TickerInputSchema } from '@/lib/validation'
import { env } from '@/lib/env'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    // 환경 변수 검증
    if (!env.SERPAPI_KEY) {
      return createErrorResponse(
        'SERPAPI_KEY_MISSING',
        'SerpAPI 키가 설정되지 않았습니다.',
        503
      )
    }

    // 쿼리 파라미터 추출
    const ticker = request.nextUrl.searchParams.get('ticker')
    const companyName =
      request.nextUrl.searchParams.get('companyName') || ticker

    // ticker 검증
    const result = TickerInputSchema.safeParse(ticker)
    if (!result.success) {
      return createErrorResponse(
        'INVALID_TICKER',
        '올바른 종목 심볼을 입력하세요 (1-5자, 영문/숫자)',
        400
      )
    }

    const validatedTicker = result.data

    // 트렌드 데이터 수집
    const trendsResult = await fetchTrendsData(
      validatedTicker,
      companyName || validatedTicker
    )

    // 성공 응답
    return createSuccessResponse(trendsResult, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Trends data fetch error:', error)

    // 트렌드 데이터를 가져올 수 없음
    return createErrorResponse(
      'TRENDS_FETCH_FAILED',
      '트렌드 데이터를 가져오지 못했습니다. 나중에 다시 시도해주세요.',
      502,
      { message }
    )
  }
}
