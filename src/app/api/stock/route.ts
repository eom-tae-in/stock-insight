/**
 * Task 009: 주가 데이터 수집 API Route
 *
 * GET /api/stock?ticker=AAPL
 * Response: ApiResponse<{ companyName, currentPrice, previousClose, priceData }>
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchStockData } from '@/lib/services/stock-service'
import { TickerInputSchema } from '@/lib/validation'
import type { ApiErrorResponse, ApiResponse } from '@/types'
import type { StockDataResult } from '@/lib/services/stock-service'

export async function GET(request: NextRequest) {
  try {
    // 쿼리 파라미터 추출
    const ticker = request.nextUrl.searchParams.get('ticker')

    // ticker 검증
    const result = TickerInputSchema.safeParse(ticker)
    if (!result.success) {
      const response: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_TICKER',
          message: '올바른 종목 심볼을 입력하세요 (1-5자, 영문/숫자)',
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(response, { status: 400 })
    }

    const validatedTicker = result.data

    // 주가 데이터 수집
    const stockData = await fetchStockData(validatedTicker)

    // 성공 응답
    const response: ApiResponse<StockDataResult> = {
      success: true,
      data: stockData,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    // ticker를 찾을 수 없음
    if (
      message.includes('No data found') ||
      message.includes('No price data')
    ) {
      const response: ApiErrorResponse = {
        success: false,
        error: {
          code: 'TICKER_NOT_FOUND',
          message: '종목을 찾을 수 없습니다. 정확한 심볼을 확인해주세요.',
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(response, { status: 404 })
    }

    // 기타 에러
    console.error('Stock data fetch error:', error)
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'STOCK_FETCH_FAILED',
        message: '주가 데이터를 가져오지 못했습니다.',
      },
      timestamp: new Date().toISOString(),
    }
    return NextResponse.json(response, { status: 500 })
  }
}
