/**
 * RESTful keyword overlay delete route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  createSuccessResponse,
  validateApiAuth,
} from '@/lib/api-helpers'
import {
  ApiServiceError,
  deleteKeywordOverlay,
} from '@/server/keyword-overlays-service'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ keywordId: string; overlayId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { keywordId, overlayId } = await params
    const result = await deleteKeywordOverlay(supabase, keywordId, overlayId)
    return createSuccessResponse(result, 200)
  } catch (error) {
    if (error instanceof ApiServiceError) {
      return createErrorResponse(error.code, error.message, error.status)
    }

    console.error('Error deleting overlay:', error)
    return createErrorResponse(
      'DB_ERROR',
      '오버레이 삭제 중 오류가 발생했습니다.',
      500
    )
  }
}
