/**
 * 회사명으로 Ticker 검색 API
 *
 * GET /api/ticker-search?q=Apple
 * Response: ApiResponse<{ symbol: string; longname: string }[]>
 */

import { NextRequest } from 'next/server'
import YahooFinance from 'yahoo-finance2'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers'

const yf = new YahooFinance()

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return createErrorResponse('EMPTY_QUERY', '검색어를 입력해주세요.', 400)
    }

    // Yahoo Finance search API 호출
    const results = await yf.search(query)

    // quotes 배열에서 필요한 정보만 추출 (주식만)
    const stocks = (results.quotes || [])
      .filter(q => q.quoteType === 'EQUITY')
      .slice(0, 5)
      .map(q => ({
        symbol: q.symbol,
        longname: q.longname || q.shortname || q.symbol,
      }))

    if (stocks.length === 0) {
      return createErrorResponse('NO_RESULTS', '검색 결과가 없습니다.', 404)
    }

    return createSuccessResponse(stocks, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Ticker search error:', error)

    return createErrorResponse(
      'SEARCH_FAILED',
      '검색 중 오류가 발생했습니다.',
      500,
      { message }
    )
  }
}
