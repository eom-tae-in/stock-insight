/**
 * RESTful keyword compatibility route
 *
 * GET /api/keywords/[keywordId]
 * DELETE /api/keywords/[keywordId]
 */

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  createSuccessResponse,
  validateApiAuth,
} from '@/lib/api-helpers'
import { deleteKeyword, getKeyword } from '@/server/keywords-service'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { userId } = authResult

    const { keywordId } = await params
    if (!keywordId) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    const keyword = await getKeyword(supabase, userId, keywordId)
    if (!keyword) {
      return createErrorResponse(
        'NOT_FOUND',
        '해당 키워드를 찾을 수 없습니다.',
        404
      )
    }

    return createSuccessResponse(keyword, 200)
  } catch (error) {
    console.error('Error fetching keyword:', error)
    return createErrorResponse('DB_ERROR', '키워드를 불러오지 못했습니다.', 500)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { userId } = authResult

    const { keywordId } = await params
    if (!keywordId) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    const deleted = await deleteKeyword(supabase, userId, keywordId)
    if (!deleted) {
      return createErrorResponse(
        'NOT_FOUND',
        '해당 키워드를 찾을 수 없습니다.',
        404
      )
    }

    return createSuccessResponse({ id: keywordId }, 200)
  } catch (error) {
    console.error('Error deleting keyword:', error)
    return createErrorResponse(
      'DB_ERROR',
      '키워드 삭제 중 오류가 발생했습니다.',
      500
    )
  }
}
