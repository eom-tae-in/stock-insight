import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  createSuccessResponse,
  validateApiAuth,
} from '@/lib/api-helpers'
import { reorderKeywords } from '@/server/keywords-service'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = (await request.json()) as { orderedIds?: unknown }
    if (
      !Array.isArray(body.orderedIds) ||
      body.orderedIds.some(id => typeof id !== 'string')
    ) {
      return createErrorResponse(
        'INVALID_ORDER',
        'orderedIds는 문자열 배열이어야 합니다.',
        400
      )
    }

    await reorderKeywords(supabase, authResult.userId, body.orderedIds)

    return createSuccessResponse({ orderedIds: body.orderedIds }, 200)
  } catch (error) {
    console.error('Error reordering keywords:', error)
    return createErrorResponse(
      'DB_ERROR',
      '키워드 순서 저장 중 오류가 발생했습니다.',
      500
    )
  }
}
