import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  createSuccessResponse,
  validateApiAuth,
} from '@/lib/api-helpers'
import {
  refreshSavedSearch,
  StockRefreshServiceError,
} from '@/server/stock-refresh-service'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { id } = await params
    const refreshedSearch = await refreshSavedSearch(
      supabase,
      authResult.userId,
      id
    )

    return createSuccessResponse(refreshedSearch, 200)
  } catch (error) {
    if (error instanceof StockRefreshServiceError) {
      return createErrorResponse(error.code, error.message, error.status)
    }

    console.error('종목 최신화에 실패했습니다.', error)
    return createErrorResponse(
      'REFRESH_FAILED',
      '종목 최신화에 실패했습니다.',
      500
    )
  }
}
