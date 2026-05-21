import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  createSuccessResponse,
  validateApiAuth,
} from '@/lib/api-helpers'
import {
  AnalysisOverlayServiceError,
  refreshAnalysisOverlay,
} from '@/server/analysis-overlays-service'
import {
  AnalysisServiceError,
  refreshKeywordAnalysis,
} from '@/server/keyword-analyses-service'

export const dynamic = 'force-dynamic'

export async function POST(
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
    await refreshKeywordAnalysis(supabase, authResult.userId, analysisId)
    const overlay = await refreshAnalysisOverlay(
      supabase,
      authResult.userId,
      analysisId,
      overlayId
    )

    return createSuccessResponse(overlay, 200)
  } catch (error) {
    if (error instanceof AnalysisServiceError) {
      return createErrorResponse(error.code, error.message, error.status)
    }

    if (error instanceof AnalysisOverlayServiceError) {
      return createErrorResponse(error.code, error.message, error.status)
    }

    console.error('Overlay 최신화에 실패했습니다.', error)
    return createErrorResponse(
      'REFRESH_FAILED',
      'Overlay 최신화에 실패했습니다.',
      500
    )
  }
}
