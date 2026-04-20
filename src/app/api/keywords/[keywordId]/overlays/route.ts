/**
 * RESTful keyword overlay route.
 *
 * GET /api/keywords/[keywordId]/overlays
 * POST /api/keywords/[keywordId]/overlays
 * PATCH /api/keywords/[keywordId]/overlays
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
  createKeywordOverlay,
  listKeywordOverlays,
  updateKeywordOverlayOrder,
} from '@/server/keyword-overlays-service'

export const dynamic = 'force-dynamic'

function handleOverlayError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiServiceError) {
    return createErrorResponse(error.code, error.message, error.status)
  }

  console.error(fallbackMessage, error)
  return createErrorResponse('DB_ERROR', fallbackMessage, 500)
}

export async function GET(
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
    const overlays = await listKeywordOverlays(supabase, keywordId)
    return createSuccessResponse(overlays, 200)
  } catch (error) {
    return handleOverlayError(error, '오버레이 목록을 불러오지 못했습니다.')
  }
}

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
    const overlay = await createKeywordOverlay(
      supabase,
      keywordId,
      await request.json()
    )

    return createSuccessResponse(overlay, 201)
  } catch (error) {
    return handleOverlayError(error, '오버레이 저장 중 오류가 발생했습니다.')
  }
}

export async function PATCH(
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
    const { orderedIds } = (await request.json()) as { orderedIds: string[] }
    const overlays = await updateKeywordOverlayOrder(
      supabase,
      keywordId,
      orderedIds
    )

    return createSuccessResponse(overlays, 200)
  } catch (error) {
    return handleOverlayError(error, '순서 업데이트 중 오류가 발생했습니다.')
  }
}
