/**
 * 회사명으로 Ticker 검색 API
 *
 * GET /api/ticker-search?q=Apple
 * Response: ApiResponse<{ symbol: string; longname: string }[]>
 *
 * US 마켓 종목만 필터링해서 반환
 * (한국.KS, 중국.SS/.SZ, 홍콩.HK 등 non-US는 제외)
 */

import { NextRequest } from 'next/server'
import YahooFinance from 'yahoo-finance2'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers'

const yf = new YahooFinance()

/**
 * 마켓 suffix로 US 마켓 종목 판별
 * .KS, .SS, .SZ, .HK 등 non-US 종목은 false
 */
function isUSMarketStock(symbol: string): boolean {
  // US 마켓은 suffix가 없거나 특정 US 마켓 코드만 허용
  // 예: AAPL, MSFT, BRK.A, BRK.B (US 내 class A/B)
  const nonUSMarketSuffixes = [
    '.KS', // Korea
    '.SS', // Shanghai
    '.SZ', // Shenzhen
    '.HK', // Hong Kong
    '.L', // London
    '.DE', // Germany
    '.PA', // Paris
    '.MI', // Milan
    '.MA', // Madrid
    '.AS', // Amsterdam
    '.SW', // Switzerland
    '.TO', // Toronto
    '.AX', // Australia
    '.NZ', // New Zealand
  ]

  return !nonUSMarketSuffixes.some(suffix => symbol.endsWith(suffix))
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return createErrorResponse('EMPTY_QUERY', '검색어를 입력해주세요.', 400)
    }

    // Yahoo Finance search API 호출
    const results = await yf.search(query)

    // quotes 배열에서 필요한 정보만 추출 (주식 + US 마켓만)
    const candidates = (
      (results.quotes || []) as Array<{
        symbol: string
        quoteType: string
        longname?: string
        shortname?: string
      }>
    )
      .filter(q => q.quoteType === 'EQUITY')
      .filter(q => isUSMarketStock(q.symbol)) // ← US 마켓 종목만
      .slice(0, 5) // 최대 5개
      .map(q => ({
        symbol: q.symbol,
        longname: q.longname || q.shortname || q.symbol,
      }))

    if (candidates.length === 0) {
      return createErrorResponse('NO_RESULTS', '검색 결과가 없습니다.', 404)
    }

    // 마켓 suffix로 이미 필터링되었으므로 추가 검증 불필요
    const validStocks = candidates

    if (validStocks.length === 0) {
      return createErrorResponse('NO_RESULTS', '검색 결과가 없습니다.', 404)
    }

    return createSuccessResponse(validStocks, 200)
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
