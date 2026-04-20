/**
 * RESTful analysis overlay detail route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  createSuccessResponse,
  validateApiAuth,
} from '@/lib/api-helpers'
import {
  AnalysisOverlayServiceError,
  deleteAnalysisOverlay,
} from '@/server/analysis-overlays-service'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ analysisId: string; overlayId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { analysisId, overlayId } = await params
    const result = await deleteAnalysisOverlay(
      supabase,
      authResult.userId,
      analysisId,
      overlayId
    )

    return createSuccessResponse(result, 200)
  } catch (error) {
    if (error instanceof AnalysisOverlayServiceError) {
      return createErrorResponse(error.code, error.message, error.status)
    }

    console.error('Overlay 삭제에 실패했습니다.', error)
    return createErrorResponse('DB_ERROR', 'Overlay 삭제에 실패했습니다.', 500)
  }
}
