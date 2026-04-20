/**
 * 종목 데이터 미리보기 API (DB 저장 안 함)
 * GET /api/stocks/[ticker]
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
