import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  createSuccessResponse,
  validateApiAuth,
} from '@/lib/api-helpers'
import {
  AnalysisServiceError,
  refreshDefaultKeywordAnalysis,
} from '@/server/keyword-analyses-service'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { keywordId } = await params
    const result = await refreshDefaultKeywordAnalysis(
      supabase,
      authResult.userId,
      keywordId
    )

    return createSuccessResponse(result, 200)
  } catch (error) {
    if (error instanceof AnalysisServiceError) {
      return createErrorResponse(error.code, error.message, error.status)
    }

    console.error('키워드 최신화에 실패했습니다.', error)
    return createErrorResponse(
      'REFRESH_FAILED',
      '키워드 최신화에 실패했습니다.',
      500
    )
  }
}
