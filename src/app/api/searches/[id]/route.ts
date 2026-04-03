/**
 * Task 013: 종목 조회/삭제 API Route
 *
 * GET /api/searches/[id]
 * Response: ApiResponse<SearchRecord>
 *
 * DELETE /api/searches/[id]
 * Response: ApiResponse<{ id: string }>
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSearchById, deleteSearch } from '@/lib/db/queries'
import {
  createErrorResponse,
  validateApiAuth,
  createSuccessResponse,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 인증 검증 (중앙화된 헬퍼 사용)
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult // 에러 응답
    }
    const { userId } = authResult

    const { id } = await params

    // ID 검증
    if (!id || id.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    // userId를 전달하여 RLS 검증 (필수)
    const search = await getSearchById(id, userId, supabase)

    if (!search) {
      return createErrorResponse(
        'NOT_FOUND',
        '해당 종목을 찾을 수 없습니다.',
        404
      )
    }

    return createSuccessResponse(search, 200)
  } catch (error) {
    console.error('Error fetching search:', error)
    return createErrorResponse(
      'DB_ERROR',
      '종목 조회 중 오류가 발생했습니다.',
      500
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 인증 검증 (중앙화된 헬퍼 사용)
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult // 에러 응답
    }

    const { id } = await params

    // ID 검증 (UUID 형식 확인)
    if (!id || id.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    // 인증된 클라이언트로 삭제 (RLS가 본인 데이터만 삭제 보장)
    const deleted = await deleteSearch(id, supabase)

    if (!deleted) {
      return createErrorResponse(
        'NOT_FOUND',
        '해당 종목을 찾을 수 없습니다.',
        404
      )
    }

    return createSuccessResponse({ id }, 200)
  } catch (error) {
    console.error('Error deleting search:', error)
    return createErrorResponse(
      'DB_ERROR',
      '종목 삭제 중 오류가 발생했습니다.',
      500
    )
  }
}
