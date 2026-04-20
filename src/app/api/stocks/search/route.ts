/**
 * 종목 검색 자동완성 API
 * GET /api/stocks/search?q=AAPL
 *
 * Response: {
 *   data: Array<{ ticker: string, companyName: string }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  validateApiAuth,
  createSuccessResponse,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 인증 검증
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const searchParams = await request.nextUrl.searchParams
    const q = searchParams.get('q')

    if (!q || q.length === 0) {
      return createSuccessResponse([], 200)
    }

    // Yahoo Finance API로 종목 검색
    try {
      const yahooFinance = new YahooFinance()
      const searchResults = (await yahooFinance.search(q, {
        enableFuzzyQuery: true,
        quotesCount: 10,
      })) as Record<string, unknown>

      // 검색 결과에서 주식(equity) 데이터만 필터링
      const quotes = Array.isArray(searchResults.quotes)
        ? searchResults.quotes
        : []
      const stocks = quotes
        .filter(
          (quote: Record<string, unknown>) =>
            quote.quoteType === 'EQUITY' || quote.typeDisp === 'Equity'
        )
        .slice(0, 10)
        .map((quote: Record<string, unknown>) => ({
          ticker: String(quote.symbol || ''),
          symbol: String(quote.symbol || ''),
          companyName: String(
            quote.longname || quote.shortname || quote.symbol || ''
          ),
          longname: String(
            quote.longname || quote.shortname || quote.symbol || ''
          ),
        }))

      // 로컬 저장 데이터도 함께 검색 (우선순위: Yahoo Finance 먼저)
      const { data: savedSearches } = await supabase
        .from('searches')
        .select('ticker, company_name')
        .or(`ticker.ilike.${q}%,company_name.ilike.%${q}%`)
        .order('ticker', { ascending: true })
        .limit(5)

      // 로컬 데이터를 티커 기준으로 변환
      const savedResults = (savedSearches || []).map(s => ({
        ticker: s.ticker,
        symbol: s.ticker,
        companyName: s.company_name,
        longname: s.company_name,
      }))

      // 중복 제거: 로컬 데이터가 이미 있으면 제외
      const savedTickers = new Set(savedResults.map(r => r.ticker))
      const yahooResults = stocks.filter(s => !savedTickers.has(s.ticker))

      // 로컬 결과가 먼저, 그 다음 Yahoo Finance 결과
      const combinedResults = [...savedResults, ...yahooResults].slice(0, 10)

      return createSuccessResponse(combinedResults, 200)
    } catch (yahooError) {
      console.error('Yahoo Finance search error:', yahooError)

      // Yahoo Finance 실패 시 로컬 저장 데이터만 반환
      const { data: searches, error } = await supabase
        .from('searches')
        .select('ticker, company_name')
        .or(`ticker.ilike.${q}%,company_name.ilike.%${q}%`)
        .order('ticker', { ascending: true })
        .limit(10)

      if (error) throw error

      const results = searches.map(s => ({
        ticker: s.ticker,
        symbol: s.ticker,
        companyName: s.company_name,
        longname: s.company_name,
      }))

      return createSuccessResponse(results, 200)
    }
  } catch (error) {
    console.error('Error searching stocks:', error)
    return createErrorResponse('SEARCH_ERROR', '종목 검색에 실패했습니다.', 500)
  }
}
