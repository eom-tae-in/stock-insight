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
import { createErrorResponse } from '@/lib/api-helpers'
import type { ApiResponse, SearchRecord } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 인증 확인
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (!user || authError) {
      return createErrorResponse('UNAUTHORIZED', '로그인이 필요합니다.', 401)
    }

    const { id } = await params

    // ID 검증
    if (!id || id.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    // 종목 조회
    const search = await getSearchById(id, supabase)

    if (!search) {
      return createErrorResponse(
        'NOT_FOUND',
        '해당 종목을 찾을 수 없습니다.',
        404
      )
    }

    // 성공 응답
    const response: ApiResponse<SearchRecord> = {
      success: true,
      data: search,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 200 })
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
    // 인증 확인
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (!user || authError) {
      return createErrorResponse('UNAUTHORIZED', '로그인이 필요합니다.', 401)
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

    // 성공 응답
    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error deleting search:', error)
    return createErrorResponse(
      'DB_ERROR',
      '종목 삭제 중 오류가 발생했습니다.',
      500
    )
  }
}
