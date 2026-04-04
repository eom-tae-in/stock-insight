/**
 * Task: 종목 데이터 저장 API Route (저장 전용)
 *
 * POST /api/stock/save
 * Body: { ticker: string }
 * Response: ApiResponse<SearchRecord>
 *
 * Yahoo Finance에서 5년 주간 주가 데이터 조회 후 DB에 저장
 * - My Stocks에 추가
 * - 차트 오버레이 "저장" 버튼
 *
 * 기능:
 * - 주가 데이터 수집 (fetchStockData)
 * - 기술 지표 계산 (calculateMetrics)
 * - 트렌드 데이터 수집 시도 (선택사항, 실패 시 계속)
 * - searches 테이블에 upsert
 * - stock_price_data 테이블에 저장
 */

import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { fetchStockData } from '@/lib/services/stock-service'
import { fetchTrendsData } from '@/lib/services/trends-service'
import { calculateMetrics } from '@/lib/calculations'
import { TickerInputSchema } from '@/lib/validation'
import { upsertSearch, insertPriceData, deleteSearch } from '@/lib/db/queries'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers'
import type { SearchRecord, TrendsDataPoint } from '@/types'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

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

    console.log(`[/api/stock/save] 저장 시작: ${validatedTicker}`)

    // 1. 주가 데이터 수집
    let stockData
    try {
      stockData = await fetchStockData(validatedTicker)
      console.log(
        `[/api/stock/save] 주가 데이터 수집 완료: ${stockData.priceData.length}개`
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[/api/stock/save] 주가 데이터 수집 실패: ${message}`)
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
      console.log(
        `[/api/stock/save] 트렌드 데이터 수집 완료: ${trendsData.length}개`
      )
    } catch (error) {
      // 트렌드 수집 실패는 경고만 하고 계속 진행 (부분 성공)
      console.warn(
        '[/api/stock/save] 트렌드 데이터 수집 실패, 주가 데이터만 저장:',
        error
      )
    }

    // 3. 지표 계산
    const metrics = calculateMetrics(stockData.priceData)

    // 4. DB 저장 (어댑터가 내부적으로 트랜잭션 처리)
    const now = new Date()

    const searchRecord: SearchRecord = {
      id: crypto.randomUUID(),
      user_id: user.id,
      ticker: validatedTicker,
      company_name: stockData.companyName,
      currency: stockData.currency,
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
    }

    console.log(
      `[/api/stock/save] SearchRecord 생성 완료, ID: ${searchRecord.id}`
    )

    // 인증된 클라이언트로 저장 (RLS 적용)
    const id = await upsertSearch(searchRecord, supabase)
    console.log(`[/api/stock/save] searches 테이블 저장 완료: ${id}`)

    // 가격 데이터 저장 (stock_price_data 테이블)
    // 원자성 보장: insertPriceData 실패 시 search 레코드를 롤백하여 데이터 불일치 방지
    try {
      await insertPriceData(id, stockData.priceData, supabase)
      console.log(
        `[/api/stock/save] stock_price_data 테이블 저장 완료: ${stockData.priceData.length}개`
      )
    } catch (error) {
      // 보상 로직: 이미 저장된 search 레코드 삭제
      console.error(
        '[/api/stock/save] stock_price_data 저장 실패, 롤백:',
        error
      )
      await deleteSearch(id, supabase)
      throw error
    }

    // 5. 응답
    console.log(`[/api/stock/save] 저장 완료: ${validatedTicker}`)
    return createSuccessResponse(searchRecord, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/stock/save] 에러:', error)

    return createErrorResponse(
      'SAVE_FAILED',
      '종목 저장 중 오류가 발생했습니다.',
      500,
      { message }
    )
  }
}
