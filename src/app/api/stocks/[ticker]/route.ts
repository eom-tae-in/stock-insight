/**
 * 오버레이 차트용 종목 가격 시계열 API (DB 저장 안 함)
 * GET /api/stocks/[ticker]
 *
 * 저장 전 종목 분석 화면은 /api/stock-data를 사용한다.
 * 이 route는 키워드 상세 화면에서 비교 차트에 올릴 { date, price } 형태의
 * 단순 시계열을 반환한다.
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { ticker } = await params
    const tickerUpper = ticker.trim().toUpperCase()

    if (!tickerUpper) {
      return createErrorResponse('INVALID_PARAMS', 'ticker은 필수입니다.', 400)
    }

    const stockData = await fetchCachedStockData(tickerUpper)

    return createSuccessResponse(
      {
        ticker: tickerUpper,
        companyName: stockData.companyName,
        priceData: stockData.priceData.map(point => ({
          date: point.date,
          price: point.close,
        })),
      },
      200
    )
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
