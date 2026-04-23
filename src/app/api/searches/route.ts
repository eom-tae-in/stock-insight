/**
 * Task 012: 종목 조회 통합 API Route
 *
 * GET /api/searches
 * Response: ApiResponse<SearchRecord[]>
 *
 * POST /api/searches
 * Body: { previewId: string; ticker?: string }
 * Response: ApiResponse<{ id: string; ticker: string }>
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAllSearches } from '@/lib/db/queries'
import {
  createSuccessResponse,
  createErrorResponse,
  validateApiAuth,
} from '@/lib/api-helpers'
import {
  saveStockPreviewAsSearch,
  StockPreviewServiceError,
} from '@/server/stock-preview-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    // 인증 검증 (중앙화된 헬퍼 사용)
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult // 에러 응답
    }
    const { userId } = authResult

    // 인증된 클라이언트로 DB에서 자신의 저장된 종목 조회 (RLS 적용)
    const records = await getAllSearches(userId, supabase)

    return createSuccessResponse(records, 200)
  } catch (error) {
    console.error('Error fetching searches:', error)
    return createErrorResponse(
      'DB_ERROR',
      '종목 목록을 가져올 수 없습니다.',
      500
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = (await request.json()) as {
      previewId?: unknown
      ticker?: unknown
    }
    if (typeof body.previewId !== 'string' || !body.previewId.trim()) {
      return createErrorResponse(
        'INVALID_INPUT',
        'previewId가 필요합니다.',
        400
      )
    }

    const savedSearch = await saveStockPreviewAsSearch(
      supabase,
      authResult.userId,
      body.previewId,
      typeof body.ticker === 'string' ? body.ticker : undefined
    )

    return createSuccessResponse(savedSearch, 201)
  } catch (error) {
    if (error instanceof StockPreviewServiceError) {
      return createErrorResponse(error.code, error.message, error.status)
    }

    console.error('Error in POST /api/searches:', error)

    return createErrorResponse(
      'SAVE_FAILED',
      '종목 저장 중 오류가 발생했습니다.',
      500
    )
  }
}
