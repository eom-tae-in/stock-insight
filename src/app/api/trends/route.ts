/**
 * Google Trends 데이터 수집 API Route
 * GET /api/trends?keyword=...
 *
 * ma13Value, yoyValue 계산을 서버에서 수행하여 응답에 포함
 */

import { NextRequest } from 'next/server'
import { callPyTrendsAPI } from '@/lib/services/trends-service'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'
import { normalizeKeywordSpacing } from '@/lib/utils/keyword-normalization'
import { parsePytrendsParams } from '@/lib/parsers/trends-parsers'
import { TrendsProviderError } from '@/server/trends-internal-service'

export async function GET(request: NextRequest) {
  try {
    const keyword = request.nextUrl.searchParams.get('keyword')
    const geo = request.nextUrl.searchParams.get('geo') ?? 'GLOBAL'
    const timeframe = request.nextUrl.searchParams.get('timeframe') ?? '5Y'
    const gprop = request.nextUrl.searchParams.get('gprop') ?? 'WEB'

    if (!keyword) {
      return createErrorResponse('INVALID_KEYWORD', '키워드를 입력하세요.', 400)
    }

    const trimmedKeyword = normalizeKeywordSpacing(keyword)
    if (!trimmedKeyword || trimmedKeyword.length > 100) {
      return createErrorResponse(
        'INVALID_KEYWORD',
        '1~100자의 유효한 키워드를 입력하세요.',
        400
      )
    }

    try {
      const parsed = parsePytrendsParams({
        keyword: trimmedKeyword,
        geo,
        timeframe,
        gprop,
      })

      const rawTrendsData = await callPyTrendsAPI(
        parsed.keyword,
        parsed.geo,
        parsed.timeframe,
        parsed.gprop
      )

      return createSuccessResponse(
        {
          trendsData: rawTrendsData,
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

      if (
        error instanceof Error &&
        error.message.startsWith('[pytrends-parser]')
      ) {
        return createErrorResponse(
          'INVALID_TRENDS_PARAMS',
          '트렌드 검색 조건이 올바르지 않습니다.',
          400,
          { message, keyword: trimmedKeyword }
        )
      }

      if (error instanceof TrendsProviderError) {
        const userMessage =
          error.type === 'RATE_LIMIT'
            ? 'Google Trends 요청이 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.'
            : '트렌드 데이터를 가져오지 못했습니다. 다른 키워드나 조건으로 시도해주세요.'

        return createErrorResponse(error.code, userMessage, error.status, {
          message,
          keyword: trimmedKeyword,
          type: error.type,
        })
      }

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
