import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  createSuccessResponse,
  validateApiAuth,
} from '@/lib/api-helpers'
import {
  AnalysisServiceError,
  refreshKeywordAnalysis,
} from '@/server/keyword-analyses-service'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { analysisId } = await params
    const analysis = await refreshKeywordAnalysis(
      supabase,
      authResult.userId,
      analysisId
    )

    return createSuccessResponse(analysis, 200)
  } catch (error) {
    if (error instanceof AnalysisServiceError) {
      return createErrorResponse(error.code, error.message, error.status)
    }

    console.error('Analysis 최신화에 실패했습니다.', error)
    return createErrorResponse(
      'REFRESH_FAILED',
      'Analysis 최신화에 실패했습니다.',
      500
    )
  }
}
