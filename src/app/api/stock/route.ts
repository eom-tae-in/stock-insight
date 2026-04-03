/**
 * Task: 새 종목 추가 API Route
 *
 * GET /api/stock?ticker={ticker}
 * Response: ApiResponse<SearchRecord>
 *
 * ticker-search에서 선택한 종목을 searches 테이블에 저장
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { upsertSearch, getSearchByTicker } from '@/lib/db/queries'
import {
  createErrorResponse,
  validateApiAuth,
  createSuccessResponse,
} from '@/lib/api-helpers'
import type { SearchRecord } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 인증 검증 (중앙화된 헬퍼 사용)
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult // 에러 응답
    }
    const { userId } = authResult

    // 쿼리 파라미터에서 ticker 추출
    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker')
    const companyName = searchParams.get('companyName') || ticker || 'Unknown'

    // ticker 검증
    if (!ticker || ticker.length === 0) {
      return createErrorResponse(
        'INVALID_INPUT',
        '종목 티커가 필요합니다.',
        400
      )
    }

    // 이미 저장된 종목인지 확인 (userId 전달하여 RLS 검증)
    const existing = await getSearchByTicker(ticker, userId, supabase)
    if (existing) {
      return createSuccessResponse(existing, 200)
    }

    // 새 SearchRecord 생성 및 저장
    // (실제 가격 데이터는 나중에 백그라운드 작업으로 추가)
    const searchRecord: SearchRecord = {
      id: '', // upsertSearch에서 생성
      user_id: userId,
      ticker: ticker.toUpperCase(),
      company_name: companyName,
      currency: 'USD',
      current_price: 0,
      previous_close: undefined,
      ma13: undefined,
      yoy_change: 0,
      week52_high: undefined,
      week52_low: undefined,
      price_data: [],
      trends_data: [],
      last_updated_at: new Date().toISOString(),
      searched_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    // DB에 저장
    const searchId = await upsertSearch(searchRecord, supabase)
    searchRecord.id = searchId

    return createSuccessResponse(searchRecord, 201)
  } catch (error) {
    console.error('Error creating stock record:', error)
    return createErrorResponse(
      'DB_ERROR',
      error instanceof Error ? error.message : '종목을 저장하지 못했습니다.',
      500
    )
  }
}
