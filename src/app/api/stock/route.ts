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
import { createErrorResponse } from '@/lib/api-helpers'
import type { ApiResponse, SearchRecord } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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

    // 이미 저장된 종목인지 확인
    const existing = await getSearchByTicker(ticker, supabase)
    if (existing) {
      const response: ApiResponse<SearchRecord> = {
        success: true,
        data: existing,
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(response, { status: 200 })
    }

    // 새 SearchRecord 생성 및 저장
    // (실제 가격 데이터는 나중에 백그라운드 작업으로 추가)
    const searchRecord: SearchRecord = {
      id: '', // upsertSearch에서 생성
      user_id: user.id,
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

    // 성공 응답
    const response: ApiResponse<SearchRecord> = {
      success: true,
      data: searchRecord,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating stock record:', error)
    return createErrorResponse(
      'DB_ERROR',
      error instanceof Error ? error.message : '종목을 저장하지 못했습니다.',
      500
    )
  }
}
