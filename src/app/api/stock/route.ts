/**
 * Task: 종목 데이터 조회 API Route (조회 전용)
 *
 * GET /api/stock?ticker={ticker}
 * Response: ApiResponse<StockDataResult>
 *
 * Yahoo Finance에서 5년 주간 주가 데이터 조회 (저장 없음)
 * - 차트 오버레이
 * - 임시 데이터 조회
 */

import { NextRequest } from 'next/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'
import { fetchStockData } from '@/lib/services/stock-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 쿼리 파라미터에서 ticker 추출
    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker')

    // ticker 검증
    if (!ticker || ticker.length === 0) {
      return createErrorResponse(
        'INVALID_INPUT',
        '종목 티커가 필요합니다.',
        400
      )
    }

    // Yahoo Finance에서 5년 주간 데이터 조회
    console.log(`[/api/stock] 주가 데이터 조회 시작: ${ticker}`)
    let stockData = null
    try {
      stockData = await fetchStockData(ticker.toUpperCase())
      console.log(
        `[/api/stock] 주가 데이터 조회 완료: ${stockData.priceData.length}개 데이터`
      )
    } catch (error) {
      console.error(
        `[/api/stock] 주가 데이터 조회 실패: ${error instanceof Error ? error.message : String(error)}`
      )
      return createErrorResponse(
        'STOCK_DATA_ERROR',
        error instanceof Error
          ? error.message
          : '주가 데이터를 불러오지 못했습니다.',
        500
      )
    }

    return createSuccessResponse(stockData, 200)
  } catch (error) {
    console.error('[/api/stock] 에러:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error
        ? error.message
        : '종목 데이터를 조회하지 못했습니다.',
      500
    )
  }
}
