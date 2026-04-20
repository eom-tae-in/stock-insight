/**
 * 종목 데이터 조회 API (키워드 분석용 - DB 저장 안 함)
 * GET /api/stock-data?ticker=AAPL
 *
 * Response: {
 *   data: {
 *     ticker: string
 *     companyName: string
 *     priceData: Array<{ date: string, price: number }>
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  validateApiAuth,
  createSuccessResponse,
} from '@/lib/api-helpers'
import { fetchCachedStockData } from '@/server/cached-stock-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 인증 검증
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const searchParams = request.nextUrl.searchParams
    const ticker = searchParams.get('ticker')

    if (!ticker) {
      return createErrorResponse('INVALID_PARAMS', 'ticker은 필수입니다.', 400)
    }

    const tickerUpper = ticker.toUpperCase()

    // Yahoo Finance에서 5년 데이터 조회 (Redis 캐시 사용, DB 저장 안 함)
    const stockData = await fetchCachedStockData(tickerUpper)

    // 응답 데이터 형성
    const responseData = {
      ticker: tickerUpper,
      companyName: stockData.companyName,
      priceData: stockData.priceData.map(p => ({
        date: p.date,
        price: p.close,
      })),
    }

    return createSuccessResponse(responseData, 200)
  } catch (error) {
    console.error('Error fetching stock data:', error)
    return createErrorResponse(
      'STOCK_ERROR',
      error instanceof Error
        ? error.message
        : '종목 데이터를 불러오지 못했습니다.',
      500
    )
  }
}
