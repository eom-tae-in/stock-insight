/**
 * GET /api/stock-data?ticker=AAPL&period=5Y&interval=1wk
 *
 * 조건 기반 주가 데이터 조회 API.
 * 같은 ticker/period/interval/마지막 완료 주 조합은 stock-data Redis cache를 재사용한다.
 */

import { NextRequest } from 'next/server'
import {
  STOCK_DATA_INTERVAL,
  STOCK_DATA_PERIOD,
  type StockDataInterval,
  type StockDataPeriod,
} from '@/server/cached-stock-service'
import { getStockAnalysisData } from '@/server/stock-analysis-service'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'
import { TickerInputSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

function parsePeriod(value: string | null): StockDataPeriod | null {
  if (value === null || value.toUpperCase() === STOCK_DATA_PERIOD) {
    return STOCK_DATA_PERIOD
  }
  return null
}

function parseInterval(value: string | null): StockDataInterval | null {
  if (value === null || value === STOCK_DATA_INTERVAL) {
    return STOCK_DATA_INTERVAL
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const tickerResult = TickerInputSchema.safeParse(
      request.nextUrl.searchParams.get('ticker')
    )
    if (!tickerResult.success) {
      return createErrorResponse(
        'INVALID_TICKER',
        '올바른 종목 심볼을 입력하세요.',
        400
      )
    }

    const period = parsePeriod(request.nextUrl.searchParams.get('period'))
    const interval = parseInterval(request.nextUrl.searchParams.get('interval'))
    if (!period || !interval) {
      return createErrorResponse(
        'UNSUPPORTED_STOCK_DATA_RANGE',
        '현재 종목 조회는 period=5Y, interval=1wk만 지원합니다.',
        400
      )
    }

    const stockData = await getStockAnalysisData(
      tickerResult.data,
      period,
      interval
    )
    if (!stockData) {
      return createErrorResponse(
        'STOCK_DATA_NOT_FOUND',
        '종목 데이터를 찾을 수 없습니다.',
        404
      )
    }

    return createSuccessResponse(stockData, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('No price data')) {
      return createErrorResponse(
        'TICKER_NOT_FOUND',
        '종목을 찾을 수 없습니다. 정확한 심볼을 확인해주세요.',
        404
      )
    }

    console.error('Error in GET /api/stock-data:', error)
    return createErrorResponse(
      'STOCK_DATA_FETCH_FAILED',
      '종목 데이터를 가져오지 못했습니다.',
      502,
      { message }
    )
  }
}
