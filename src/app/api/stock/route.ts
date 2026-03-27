/**
 * Task 009: 주가 데이터 수집 API Route
 *
 * GET /api/stock?ticker=AAPL
 * Response: ApiResponse<{ companyName, currentPrice, previousClose, priceData }>
 */

import { NextRequest } from 'next/server'
import { fetchStockData } from '@/lib/services/stock-service'
import { TickerInputSchema } from '@/lib/validation'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    // 쿼리 파라미터 추출
    const ticker = request.nextUrl.searchParams.get('ticker')

    // ticker 검증
    const result = TickerInputSchema.safeParse(ticker)
    if (!result.success) {
      return createErrorResponse(
        'INVALID_TICKER',
        '올바른 종목 심볼을 입력하세요 (1-5자, 영문/숫자)',
        400
      )
    }

    const validatedTicker = result.data

    // 주가 데이터 수집
    const stockData = await fetchStockData(validatedTicker)

    // 성공 응답
    return createSuccessResponse(stockData, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    // ticker를 찾을 수 없음
    if (
      message.includes('No data found') ||
      message.includes('No price data')
    ) {
      return createErrorResponse(
        'TICKER_NOT_FOUND',
        '종목을 찾을 수 없습니다. 정확한 심볼을 확인해주세요.',
        404
      )
    }

    // 기타 에러
    console.error('Stock data fetch error:', error)
    return createErrorResponse(
      'STOCK_FETCH_FAILED',
      '주가 데이터를 가져오지 못했습니다.',
      500
    )
  }
}
