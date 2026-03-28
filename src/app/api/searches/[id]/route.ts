/**
 * Task 013: 종목 삭제 API Route
 *
 * DELETE /api/searches/[id]
 * Response: ApiResponse<{ id: string }>
 */

import { NextRequest, NextResponse } from 'next/server'
import { deleteSearch } from '@/lib/db/queries'
import { createErrorResponse } from '@/lib/api-helpers'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // ID 검증 (UUID 형식 확인)
    if (!id || id.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    // DB에서 삭제
    const deleted = await deleteSearch(id)

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
