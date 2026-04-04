/**
 * Google Trends 데이터 수집 API Route
 * GET /api/trends?keyword=...
 */

import { NextRequest } from 'next/server'
import { callPyTrendsAPI } from '@/lib/services/trends-service'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

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
