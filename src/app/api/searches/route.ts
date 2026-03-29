/**
 * Task 012: 종목 조회 통합 API Route
 *
 * GET /api/searches
 * Response: ApiResponse<SearchRecord[]>
 *
 * POST /api/searches
 * Body: { ticker: string }
 * Response: ApiResponse<{ id: string; ticker: string }>
 */

import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { fetchStockData } from '@/lib/services/stock-service'
import { fetchTrendsData } from '@/lib/services/trends-service'
import { calculateMetrics } from '@/lib/calculations'
import { TickerInputSchema } from '@/lib/validation'
import {
  getAllSearches,
  upsertSearch,
  replaceStockData,
  deleteSearch,
} from '@/lib/db/queries'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers'
import type { SearchRecord, TrendsDataPoint } from '@/types'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
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

    // 인증된 클라이언트로 DB에서 자신의 저장된 종목 조회 (RLS 적용)
    const records = await getAllSearches(supabase)

    return createSuccessResponse(records, 200)
  } catch (error) {
    console.error('Error fetching searches:', error)
    return createErrorResponse(
      'DB_ERROR',
      '종목 목록을 가져올 수 없습니다.',
      500
    )
  }
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
    const body = await request.json()
    const { ticker } = body

    // ticker 검증
    const result = TickerInputSchema.safeParse(ticker)
    if (!result.success) {
      return createErrorResponse(
        'INVALID_TICKER',
        '올바른 종목 심볼을 입력하세요 (1-12자, 영문/숫자/점 포함)',
        400
      )
    }

    const validatedTicker = result.data

    // 1. 주가 데이터 수집
    let stockData
    try {
      stockData = await fetchStockData(validatedTicker)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('No price data')) {
        return createErrorResponse(
          'TICKER_NOT_FOUND',
          '종목을 찾을 수 없습니다. 정확한 심볼을 확인해주세요.',
          404
        )
      }
      throw error
    }

    // 2. 트렌드 데이터 수집 (실패 시 빈 배열로 계속)
    let trendsData: TrendsDataPoint[] = []
    try {
      const trendsResult = await fetchTrendsData(
        validatedTicker,
        stockData.companyName
      )
      trendsData = trendsResult.trendsData
    } catch (error) {
      // 트렌드 수집 실패는 경고만 하고 계속 진행 (부분 성공)
      console.warn(
        'Trends fetch failed, proceeding without trends data:',
        error
      )
    }

    // 3. 지표 계산
    const metrics = calculateMetrics(stockData.priceData)

    // 4. DB 저장 (어댑터가 내부적으로 트랜잭션 처리)
    const now = new Date()

    const searchRecord: SearchRecord = {
      id: crypto.randomUUID(),
      ticker: validatedTicker,
      company_name: stockData.companyName,
      current_price: metrics.currentPrice,
      previous_close: metrics.previousClose,
      ma13: metrics.ma13,
      yoy_change: metrics.yoyChange,
      week52_high: metrics.week52High,
      week52_low: metrics.week52Low,
      price_data: stockData.priceData,
      trends_data: trendsData,
      last_updated_at: now.toISOString(),
      searched_at: now.toISOString(),
      created_at: now.toISOString(),
      user_id: user.id, // 인증된 사용자의 ID 설정
    }

    // 인증된 클라이언트로 저장 (RLS 적용)
    const id = await upsertSearch(searchRecord, supabase)

    // Phase 6: Supabase 단일 기반 - 가격 및 트렌드 데이터 저장
    // 원자성 보장: replaceStockData 실패 시 search 레코드를 롤백하여 데이터 불일치 방지
    try {
      await replaceStockData(id, stockData.priceData, trendsData, supabase)
    } catch (error) {
      // 보상 로직: 이미 저장된 search 레코드 삭제
      await deleteSearch(id, supabase)
      throw error
    }

    // 5. 응답
    return createSuccessResponse(
      {
        id,
        ticker: validatedTicker,
      },
      201
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in POST /api/searches:', error)

    return createErrorResponse(
      'SEARCH_FAILED',
      '종목 조회 중 오류가 발생했습니다.',
      500,
      { message }
    )
  }
}
