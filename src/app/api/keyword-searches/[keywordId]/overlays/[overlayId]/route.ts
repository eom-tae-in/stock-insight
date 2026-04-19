/**
 * Overlay 단건 삭제 API
 * DELETE /api/keyword-searches/[keywordId]/overlays/[overlayId]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  validateApiAuth,
  createSuccessResponse,
} from '@/lib/api-helpers'
import { getKeywordStockOverlays, removeStockOverlay } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keywordId: string; overlayId: string }> }
) {
  try {
    // 인증 검증
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { keywordId, overlayId } = await params

    if (!keywordId || !overlayId || overlayId.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    const overlays = await getKeywordStockOverlays(keywordId, supabase)
    const targetOverlay = overlays.find(overlay => overlay.id === overlayId)

    if (!targetOverlay) {
      return createErrorResponse(
        'NOT_FOUND',
        '오버레이를 찾을 수 없습니다.',
        404
      )
    }

    const deleted = await removeStockOverlay(overlayId, supabase)

    if (!deleted) {
      return createErrorResponse(
        'DELETE_FAILED',
        '오버레이를 삭제하지 못했습니다.',
        500
      )
    }

    return createSuccessResponse({ success: true }, 200)
  } catch (error) {
    console.error('Error deleting overlay:', error)
    return createErrorResponse(
      'DB_ERROR',
      '오버레이 삭제 중 오류가 발생했습니다.',
      500
    )
  }
}
