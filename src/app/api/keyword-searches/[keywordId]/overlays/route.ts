/**
 * Task: 키워드별 종목 오버레이 API Route
 *
 * GET /api/keyword-searches/[keywordId]/overlays
 * Response: ApiResponse<KeywordStockOverlay[]>
 *
 * POST /api/keyword-searches/[keywordId]/overlays
 * Body: { searchId: string, displayOrder?: number }
 * Response: ApiResponse<KeywordStockOverlay>
 *
 * DELETE /api/keyword-searches/[keywordId]/overlays?overlayId={overlayId}
 * Response: ApiResponse<{ id: string }>
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getKeywordStockOverlays,
  addStockOverlay,
  removeStockOverlay,
} from '@/lib/db/queries'
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

export async function POST(
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

    // 요청 바디 파싱
    const body = await request.json()
    const { searchId, displayOrder } = body as {
      searchId: string
      displayOrder?: number
    }

    // 유효성 검사
    if (!searchId) {
      return createErrorResponse('INVALID_INPUT', '종목 ID가 필요합니다.', 400)
    }

    // 오버레이 추가
    console.log('[POST overlays] Adding overlay:', {
      keywordId,
      searchId,
      displayOrder,
    })
    const overlayId = await addStockOverlay(
      keywordId,
      searchId,
      displayOrder,
      supabase
    )
    console.log('[POST overlays] Overlay created with ID:', overlayId)

    // 생성된 오버레이 조회 후 반환
    const overlays = await getKeywordStockOverlays(keywordId, supabase)
    console.log('[POST overlays] Total overlays after insert:', overlays.length)
    const created = overlays.find(o => o.id === overlayId)

    if (!created) {
      throw new Error('Failed to retrieve created overlay')
    }

    // 성공 응답
    const response: ApiResponse<KeywordStockOverlay> = {
      success: true,
      data: created,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating overlay:', error)
    return createErrorResponse(
      'DB_ERROR',
      '오버레이 추가 중 오류가 발생했습니다.',
      500
    )
  }
}

export async function DELETE(
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

    // 쿼리 파라미터에서 overlayId 추출
    const { searchParams } = new URL(request.url)
    const overlayId = searchParams.get('overlayId')

    // overlayId 검증
    if (!overlayId || overlayId.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    // 오버레이 삭제
    const deleted = await removeStockOverlay(overlayId, supabase)

    if (!deleted) {
      return createErrorResponse(
        'NOT_FOUND',
        '해당 오버레이를 찾을 수 없습니다.',
        404
      )
    }

    // 성공 응답
    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: overlayId },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error deleting overlay:', error)
    return createErrorResponse(
      'DB_ERROR',
      '오버레이 삭제 중 오류가 발생했습니다.',
      500
    )
  }
}
