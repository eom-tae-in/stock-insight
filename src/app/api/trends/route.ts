/**
 * Task 010: Google Trends 데이터 수집 API Route
 *
 * GET /api/trends?ticker=AAPL&companyName=Apple+Inc.
 * Response: ApiResponse<{ trendsData, keyword }>
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchTrendsData } from '@/lib/services/trends-service'
import { TickerInputSchema } from '@/lib/validation'
import { env } from '@/lib/env'
import type { ApiErrorResponse, ApiResponse } from '@/types'
import type { TrendsDataResult } from '@/lib/services/trends-service'

export async function GET(request: NextRequest) {
  try {
    // 환경 변수 검증
    if (!env.SERPAPI_KEY) {
      const response: ApiErrorResponse = {
        success: false,
        error: {
          code: 'SERPAPI_KEY_MISSING',
          message: 'SerpAPI 키가 설정되지 않았습니다.',
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(response, { status: 503 })
    }

    // 쿼리 파라미터 추출
    const ticker = request.nextUrl.searchParams.get('ticker')
    const companyName =
      request.nextUrl.searchParams.get('companyName') || ticker

    // ticker 검증
    const result = TickerInputSchema.safeParse(ticker)
    if (!result.success) {
      const response: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_TICKER',
          message: '올바른 종목 심볼을 입력하세요 (1-5자, 영문/숫자)',
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(response, { status: 400 })
    }

    const validatedTicker = result.data

    // 트렌드 데이터 수집
    const trendsResult = await fetchTrendsData(
      validatedTicker,
      companyName || validatedTicker
    )

    // 성공 응답
    const response: ApiResponse<TrendsDataResult> = {
      success: true,
      data: trendsResult,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Trends data fetch error:', error)

    // 트렌드 데이터를 가져올 수 없음
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'TRENDS_FETCH_FAILED',
        message:
          '트렌드 데이터를 가져오지 못했습니다. 나중에 다시 시도해주세요.',
        details: { message },
      },
      timestamp: new Date().toISOString(),
    }
    return NextResponse.json(response, { status: 502 })
  }
}
