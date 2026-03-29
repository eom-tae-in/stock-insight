/**
 * Google Trends 데이터 수집 API Route
 *
 * F004 (ticker 기반): GET /api/trends?ticker=AAPL&companyName=Apple+Inc.
 * F017 (keyword 기반): GET /api/trends?keyword=artificial+intelligence
 * F023 확장: GET /api/trends?keyword=...&geo=US&timeframe=1y&gprop=youtube
 * Response: ApiResponse<{ trendsData, keyword }>
 */

import { NextRequest } from 'next/server'
import { fetchTrendsData, callPyTrendsAPI } from '@/lib/services/trends-service'
import { TickerInputSchema } from '@/lib/validation'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers'
import { TIMEFRAMES, GEO_CODES, GPROPS } from '@/lib/constants/trends'

export async function GET(request: NextRequest) {
  try {
    // 쿼리 파라미터 추출
    const keyword = request.nextUrl.searchParams.get('keyword')
    const ticker = request.nextUrl.searchParams.get('ticker')
    const companyName =
      request.nextUrl.searchParams.get('companyName') || ticker

    // F023: 국가/기간/범위 파라미터 (allowlist 검증 - 공유 상수 사용)
    const rawGeo = request.nextUrl.searchParams.get('geo') ?? ''
    const geo = (GEO_CODES as readonly string[]).includes(rawGeo) ? rawGeo : ''

    const rawTimeframe = request.nextUrl.searchParams.get('timeframe')
    const timeframe =
      rawTimeframe && (TIMEFRAMES as readonly string[]).includes(rawTimeframe)
        ? rawTimeframe
        : '5y'

    const rawGprop = request.nextUrl.searchParams.get('gprop') ?? ''
    const gprop = (GPROPS as readonly string[]).includes(rawGprop)
      ? rawGprop
      : ''

    // ============================================================================
    // F017: 키워드 기반 트렌드 조회 (keyword 파라미터 우선)
    // F023: 국가/기간/범위 파라미터 지원
    // ============================================================================
    if (keyword) {
      // 키워드 검증 (1-100자, 빈 값 방지)
      const trimmedKeyword = keyword.trim()
      if (!trimmedKeyword || trimmedKeyword.length > 100) {
        return createErrorResponse(
          'INVALID_KEYWORD',
          '1~100자의 유효한 키워드를 입력하세요.',
          400
        )
      }

      try {
        const trendsData = await callPyTrendsAPI(
          trimmedKeyword,
          geo,
          timeframe,
          gprop
        )
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
    }

    // ============================================================================
    // F004: ticker 기반 트렌드 조회 (기존 로직)
    // ============================================================================
    // ticker 검증
    const result = TickerInputSchema.safeParse(ticker)
    if (!result.success) {
      return createErrorResponse(
        'INVALID_TICKER',
        '올바른 종목 심볼을 입력하세요 (1-12자, 영문/숫자/점 포함)',
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
