/**
 * RESTful analysis overlay route.
 *
 * GET /api/analyses/[analysisId]/overlays
 * POST /api/analyses/[analysisId]/overlays
 * PATCH /api/analyses/[analysisId]/overlays
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
  createAnalysisOverlay,
  listAnalysisOverlays,
  updateAnalysisOverlayOrder,
} from '@/server/analysis-overlays-service'

export const dynamic = 'force-dynamic'

function handleOverlayError(error: unknown, fallbackMessage: string) {
  if (error instanceof AnalysisOverlayServiceError) {
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
    const overlays = await listAnalysisOverlays(
      supabase,
      authResult.userId,
      analysisId
    )

    return createSuccessResponse(overlays, 200)
  } catch (error) {
    return handleOverlayError(error, 'Overlays를 조회하지 못했습니다.')
  }
}

export async function POST(
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
    const overlay = await createAnalysisOverlay(
      supabase,
      authResult.userId,
      analysisId,
      await request.json()
    )

    return createSuccessResponse(overlay, 201)
  } catch (error) {
    return handleOverlayError(error, 'Overlay 추가에 실패했습니다.')
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
    const { overlays } = (await request.json()) as { overlays: unknown[] }
    const result = await updateAnalysisOverlayOrder(
      supabase,
      authResult.userId,
      analysisId,
      overlays
    )

    return createSuccessResponse(result, 200)
  } catch (error) {
    return handleOverlayError(error, 'Overlay 순서 변경에 실패했습니다.')
  }
}
