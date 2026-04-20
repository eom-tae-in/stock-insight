/**
 * RESTful keyword overlay batch delete route.
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
  batchDeleteKeywordOverlays,
} from '@/server/keyword-overlays-service'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { keywordId } = await params
    const { overlayIds } = (await request.json()) as { overlayIds: string[] }
    const result = await batchDeleteKeywordOverlays(
      supabase,
      keywordId,
      overlayIds
    )

    return createSuccessResponse(result, 200)
  } catch (error) {
    if (error instanceof ApiServiceError) {
      return createErrorResponse(error.code, error.message, error.status)
    }

    console.error('[batch-delete] Error:', error)
    return createErrorResponse(
      'BATCH_DELETE_FAILED',
      '배치 삭제 중 오류가 발생했습니다.',
      500
    )
  }
}
