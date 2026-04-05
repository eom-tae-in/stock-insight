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

    const { overlayId } = await params

    if (!overlayId || overlayId.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    // 임시 오버레이 삭제
    const { error: deleteError } = await supabase
      .from('keyword_temporary_overlays')
      .delete()
      .eq('id', overlayId)

    if (deleteError) {
      console.error('Delete error:', deleteError)
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
