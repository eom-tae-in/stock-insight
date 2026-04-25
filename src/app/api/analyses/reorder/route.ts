import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  createSuccessResponse,
  validateApiAuth,
} from '@/lib/api-helpers'
import {
  AnalysisServiceError,
  reorderOwnedAnalyses,
} from '@/server/keyword-analyses-service'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = await request.json()
    const result = await reorderOwnedAnalyses(
      supabase,
      authResult.userId,
      body.orderedIds
    )

    return createSuccessResponse(result, 200)
  } catch (error) {
    if (error instanceof AnalysisServiceError) {
      return createErrorResponse(error.code, error.message, error.status)
    }

    console.error('Error reordering analyses:', error)
    return createErrorResponse(
      'DB_ERROR',
      '조건 순서 저장 중 오류가 발생했습니다.',
      500
    )
  }
}
