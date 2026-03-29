/**
 * 회사명으로 Ticker 검색 API
 *
 * GET /api/ticker-search?q=Apple
 * Response: ApiResponse<{ symbol: string; longname: string }[]>
 *
 * 실제로 5년 데이터를 가져올 수 있는 종목만 반환
 */

import { NextRequest } from 'next/server'
import { subYears } from 'date-fns'
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
    const candidates = (
      (results.quotes || []) as Array<{
        symbol: string
        quoteType: string
        longname?: string
        shortname?: string
      }>
    )
      .filter(q => q.quoteType === 'EQUITY')
      .slice(0, 20) // 더 많이 먼저 가져오기 (일부는 데이터 조회 불가)
      .map(q => ({
        symbol: q.symbol,
        longname: q.longname || q.shortname || q.symbol,
      }))

    if (candidates.length === 0) {
      return createErrorResponse('NO_RESULTS', '검색 결과가 없습니다.', 404)
    }

    // 각 ticker에 대해 실제로 5년 데이터를 가져올 수 있는지 병렬 검증
    const endDate = new Date()
    const startDate = subYears(endDate, 5)

    // Promise.allSettled로 병렬 처리 (각 종목 동시에 검증)
    const validationResults = await Promise.allSettled(
      candidates.map(async stock => {
        try {
          const historicalData = await yf.historical(stock.symbol, {
            period1: startDate,
            period2: endDate,
            interval: '1wk',
            events: 'history',
          })

          if (historicalData && historicalData.length > 0) {
            return stock
          }
          return null
        } catch {
          console.debug(`Cannot fetch 5y data for ${stock.symbol}`)
          return null
        }
      })
    )

    // 검증 결과에서 유효한 종목만 추출 (최대 5개)
    const validStocks: { symbol: string; longname: string }[] =
      validationResults
        .filter(
          (
            result
          ): result is {
            status: 'fulfilled'
            value: { symbol: string; longname: string } | null
          } => result.status === 'fulfilled'
        )
        .map(result => result.value)
        .filter(
          (stock): stock is { symbol: string; longname: string } =>
            stock !== null
        )
        .slice(0, 5)

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
