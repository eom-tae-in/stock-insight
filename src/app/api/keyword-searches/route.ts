/**
 * Task: 키워드 조합 저장 API Route (재설계)
 *
 * GET /api/keyword-searches
 * Response: ApiResponse<KeywordSearchRecord[]>
 *
 * POST /api/keyword-searches
 * Body: {
 *   keyword: string,
 *   chartData: Array<{date, trendsValue, ma13Value, yoyValue}>,
 *   overlays: Array<{ticker, companyName, overlayData: Array<{date, normalizedPrice, rawPrice}>}>
 * }
 * Response: ApiResponse<KeywordSearchRecord>
 *
 * DELETE /api/keyword-searches?id={id}
 * Response: ApiResponse<{ id: string }>
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getAllKeywordSearches,
  upsertKeywordSearch,
  deleteKeywordSearch,
  insertKeywordChartTimeseries,
  addStockOverlay,
  insertOverlayChartTimeseries,
} from '@/lib/db/queries'
import {
  createErrorResponse,
  validateApiAuth,
  createSuccessResponse,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 인증 검증 (중앙화된 헬퍼 사용)
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult // 에러 응답
    }

    // 저장된 키워드 목록 조회
    const keywords = await getAllKeywordSearches(supabase)

    return createSuccessResponse(keywords, 200)
  } catch (error) {
    console.error('Error fetching keyword searches:', error)
    return createErrorResponse(
      'DB_ERROR',
      '키워드 목록을 불러오지 못했습니다.',
      500
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 인증 검증 (중앙화된 헬퍼 사용)
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult // 에러 응답
    }
    const { userId } = authResult

    // 요청 바디 파싱
    const body = await request.json()
    const {
      keyword,
      chartData,
      overlays,
    }: {
      keyword: string
      chartData: Array<{
        weekIndex: number
        date: string
        trendsValue: number
        ma13Value: number | null
        yoyValue: number | null
      }>
      overlays?: Array<{
        searchId: string
        ticker: string
        companyName: string
        overlayData: Array<{
          date: string
          normalizedPrice: number
          rawPrice: number
        }>
      }>
    } = body

    // 유효성 검사
    if (!keyword || !Array.isArray(chartData)) {
      return createErrorResponse(
        'INVALID_INPUT',
        '키워드와 차트 데이터가 필요합니다.',
        400
      )
    }

    // 1. 키워드 저장
    console.log('[POST keyword-searches] Saving keyword:', keyword)
    const keywordSearchId = await upsertKeywordSearch(
      {
        id: '',
        user_id: userId,
        keyword,
        trends_data: [],
        searched_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_viewed_at: undefined,
      },
      supabase
    )
    console.log(
      '[POST keyword-searches] Keyword saved with ID:',
      keywordSearchId
    )

    // 2. 차트 시계열 데이터 저장
    if (chartData.length > 0) {
      console.log(
        '[POST keyword-searches] Saving chart timeseries:',
        chartData.length
      )
      await insertKeywordChartTimeseries(keywordSearchId, chartData, supabase)
    }

    // 3. 오버레이 저장
    if (overlays && overlays.length > 0) {
      console.log('[POST keyword-searches] Saving overlays:', overlays.length)
      for (let i = 0; i < overlays.length; i++) {
        const overlay = overlays[i]
        console.log(
          `[POST keyword-searches] Overlay ${i}:`,
          overlay.ticker,
          overlay.searchId
        )

        // 오버레이 메타데이터 저장
        const overlayId = await addStockOverlay(
          keywordSearchId,
          overlay.searchId,
          overlay.ticker,
          overlay.companyName,
          i,
          supabase
        )
        console.log(
          '[POST keyword-searches] Overlay created with ID:',
          overlayId
        )

        // 오버레이 시계열 데이터 저장
        if (overlay.overlayData && overlay.overlayData.length > 0) {
          await insertOverlayChartTimeseries(
            overlayId,
            overlay.overlayData,
            supabase
          )
          console.log('[POST keyword-searches] Overlay timeseries saved')
        }
      }
    }

    // 4. 성공 응답
    const savedKeyword = await getAllKeywordSearches(supabase)
    const created = savedKeyword.find(k => k.id === keywordSearchId)

    if (!created) {
      throw new Error('Failed to retrieve created keyword')
    }

    return createSuccessResponse(created, 201)
  } catch (error) {
    console.error('Error creating keyword search:', error)
    return createErrorResponse(
      'DB_ERROR',
      '키워드 저장 중 오류가 발생했습니다.',
      500
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 인증 검증 (중앙화된 헬퍼 사용)
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult // 에러 응답
    }

    // 쿼리 파라미터에서 id 추출
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    // ID 검증
    if (!id || id.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    // 키워드 삭제
    const deleted = await deleteKeywordSearch(id, supabase)

    if (!deleted) {
      return createErrorResponse(
        'NOT_FOUND',
        '해당 키워드를 찾을 수 없습니다.',
        404
      )
    }

    return createSuccessResponse({ id }, 200)
  } catch (error) {
    console.error('Error deleting keyword search:', error)
    return createErrorResponse(
      'DB_ERROR',
      '키워드 삭제 중 오류가 발생했습니다.',
      500
    )
  }
}
