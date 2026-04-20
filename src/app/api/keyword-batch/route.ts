/**
 * 키워드 배치 데이터 조회 API
 * POST /api/keyword-batch
 *
 * 요청:
 * {
 *   keywordId: string,
 *   symbols: string[]
 * }
 *
 * 응답:
 * {
 *   trends: TrendsDataPoint[],
 *   stocks: {
 *     AMZN: StockDataResult,
 *     AMD: StockDataResult,
 *     ...
 *   }
 * }
 *
 * 용도: 키워드 커스텀 목록 "전체 최신화" 기능
 * - 저장된 키워드의 트렌드 데이터 조회
 * - 모든 종목의 주가 데이터 배치 조회
 */

import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { fetchCachedStockData } from '@/server/cached-stock-service'
import { getKeywordAnalysis } from '@/server/keyword-analyses-service'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers'
import type { TrendsDataPoint } from '@/types'
import type { StockDataResult } from '@/lib/services/stock-service'

export const dynamic = 'force-dynamic'

interface KeywordBatchRequest {
  keywordId: string
  symbols: string[]
}

interface KeywordBatchResponse {
  trends: TrendsDataPoint[]
  stocks: Record<string, StockDataResult>
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (!user || authError) {
      return createErrorResponse('UNAUTHORIZED', '로그인이 필요합니다.', 401)
    }

    // 요청 본문 파싱
    const body = (await request.json()) as KeywordBatchRequest
    const { keywordId, symbols } = body

    // 요청 검증
    if (!keywordId || !Array.isArray(symbols) || symbols.length === 0) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'keywordId와 symbols 배열이 필요합니다.',
        400
      )
    }

    if (symbols.length > 50) {
      return createErrorResponse(
        'INVALID_REQUEST',
        '최대 50개 종목까지만 조회 가능합니다.',
        400
      )
    }

    // 1. 기본 키워드 분석 트렌드 데이터 조회
    let trendsData: TrendsDataPoint[] = []
    try {
      const analysis = await getKeywordAnalysis(supabase, user.id, keywordId)
      if (!analysis) {
        return createErrorResponse(
          'KEYWORD_NOT_FOUND',
          '키워드를 찾을 수 없습니다.',
          404
        )
      }
      trendsData = analysis.trends_data
    } catch (error) {
      console.error('[/api/keyword-batch] 트렌드 데이터 조회 실패:', error)
      return createErrorResponse(
        'TRENDS_FETCH_FAILED',
        '트렌드 데이터를 조회하지 못했습니다.',
        502,
        { message: error instanceof Error ? error.message : 'Unknown error' }
      )
    }

    // 2. 주가 데이터 배치 조회
    const stockResults: Record<string, StockDataResult> = {}
    const failedSymbols: string[] = []

    await Promise.all(
      symbols.map(async symbol => {
        try {
          const stockData = await fetchCachedStockData(symbol)
          stockResults[symbol] = stockData
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown error'
          console.warn(
            `[/api/keyword-batch] ${symbol} 주가 조회 실패: ${message}`
          )
          failedSymbols.push(symbol)
        }
      })
    )

    if (Object.keys(stockResults).length === 0) {
      return createErrorResponse(
        'STOCKS_FETCH_FAILED',
        '조회 가능한 종목이 없습니다.',
        502,
        { failedSymbols }
      )
    }

    // 성공한 종목이 일부만 있으면 경고 로그
    if (failedSymbols.length > 0) {
      console.warn(
        `[/api/keyword-batch] 일부 종목 조회 실패: ${failedSymbols.join(', ')}`
      )
    }

    // 3. 응답
    const response: KeywordBatchResponse = {
      trends: trendsData,
      stocks: stockResults,
    }

    return createSuccessResponse(response, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/keyword-batch] 에러:', error)

    return createErrorResponse(
      'BATCH_FETCH_FAILED',
      '배치 데이터 조회 중 오류가 발생했습니다.',
      500,
      { message }
    )
  }
}
