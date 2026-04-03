/**
 * Task: 키워드별 종목 오버레이 조회 API Route
 *
 * GET /api/keyword-searches/[keywordId]/overlays
 * Response: ApiResponse<KeywordStockOverlay[]>
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getKeywordStockOverlays } from '@/lib/db/queries'
import { createErrorResponse } from '@/lib/api-helpers'
import type { ApiResponse, KeywordStockOverlay } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ keywordId: string }> }
) {
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

    const { keywordId } = await params

    // ID 검증
    if (!keywordId || keywordId.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    // 오버레이 목록 조회
    const overlays = await getKeywordStockOverlays(keywordId, supabase)

    // 성공 응답
    const response: ApiResponse<KeywordStockOverlay[]> = {
      success: true,
      data: overlays,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error fetching overlays:', error)
    return createErrorResponse(
      'DB_ERROR',
      '오버레이 목록을 불러오지 못했습니다.',
      500
    )
  }
}
