/**
 * 키워드별 종목 오버레이 API Route
 *
 * GET /api/keyword-searches/[keywordId]/overlays - 오버레이 목록 조회
 * PATCH /api/keyword-searches/[keywordId]/overlays - 오버레이 순서 변경
 * Response: ApiResponse<KeywordStockOverlay[]>
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getKeywordStockOverlays } from '@/lib/db/queries'
import {
  createErrorResponse,
  validateApiAuth,
  createSuccessResponse,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  try {
    // 인증 검증 (중앙화된 헬퍼 사용)
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult // 에러 응답
    }

    const { keywordId } = await params

    // ID 검증
    if (!keywordId || keywordId.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    // 오버레이 목록 조회
    const overlays = await getKeywordStockOverlays(keywordId, supabase)

    return createSuccessResponse(overlays, 200)
  } catch (error) {
    console.error('Error fetching overlays:', error)
    return createErrorResponse(
      'DB_ERROR',
      '오버레이 목록을 불러오지 못했습니다.',
      500
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  try {
    // 인증 검증
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { keywordId } = await params

    if (!keywordId || keywordId.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    const body = await request.json()
    const { orderedIds } = body as { orderedIds: string[] }

    if (!Array.isArray(orderedIds)) {
      return createErrorResponse(
        'INVALID_BODY',
        'orderedIds는 배열이어야 합니다.',
        400
      )
    }

    // 각 overlay의 display_order 업데이트
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('keyword_stock_overlays')
        .update({ display_order: index })
        .eq('id', id)
        .eq('keyword_search_id', keywordId)
    )

    const results = await Promise.all(updates)

    // 에러 확인
    for (const result of results) {
      if (result.error) {
        console.error('Update error:', result.error)
        return createErrorResponse(
          'DB_ERROR',
          '순서 업데이트에 실패했습니다.',
          500
        )
      }
    }

    // 업데이트된 오버레이 목록 반환
    const overlays = await getKeywordStockOverlays(keywordId, supabase)
    return createSuccessResponse(overlays, 200)
  } catch (error) {
    console.error('Error updating overlay order:', error)
    return createErrorResponse(
      'DB_ERROR',
      '순서 업데이트 중 오류가 발생했습니다.',
      500
    )
  }
}
