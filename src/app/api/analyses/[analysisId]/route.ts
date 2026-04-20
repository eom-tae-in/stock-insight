/**
 * RESTful analysis detail route.
 *
 * GET /api/analyses/[analysisId]
 * PATCH /api/analyses/[analysisId]
 * DELETE /api/analyses/[analysisId]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  createSuccessResponse,
  validateApiAuth,
} from '@/lib/api-helpers'
import {
  AnalysisServiceError,
  deleteOwnedAnalysis,
  getOwnedAnalysis,
  updateOwnedAnalysis,
} from '@/server/keyword-analyses-service'

export const dynamic = 'force-dynamic'

function handleAnalysisError(error: unknown, fallbackMessage: string) {
  if (error instanceof AnalysisServiceError) {
    return createErrorResponse(error.code, error.message, error.status)
  }

  console.error(fallbackMessage, error)
  return createErrorResponse('DB_ERROR', fallbackMessage, 500)
}

export async function GET(
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
    const analysis = await getOwnedAnalysis(
      supabase,
      authResult.userId,
      analysisId
    )

    if (!analysis) {
      return createErrorResponse(
        'NOT_FOUND',
        'Analysis를 찾을 수 없습니다.',
        404
      )
    }

    return createSuccessResponse(analysis, 200)
  } catch (error) {
    return handleAnalysisError(error, 'Analysis를 조회하지 못했습니다.')
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { analysisId } = await params
    const result = await updateOwnedAnalysis(
      supabase,
      authResult.userId,
      analysisId,
      await request.json()
    )

    return createSuccessResponse(result, 200)
  } catch (error) {
    return handleAnalysisError(error, 'Analysis 업데이트에 실패했습니다.')
  }
}

export async function DELETE(
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
    const result = await deleteOwnedAnalysis(
      supabase,
      authResult.userId,
      analysisId
    )

    return createSuccessResponse(result, 200)
  } catch (error) {
    return handleAnalysisError(error, 'Analysis 삭제에 실패했습니다.')
  }
}
