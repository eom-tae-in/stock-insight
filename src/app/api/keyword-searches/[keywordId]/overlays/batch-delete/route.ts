/**
 * 키워드 오버레이 배치 삭제 API
 * POST /api/keyword-searches/[keywordId]/overlays/batch-delete
 *
 * 요청:
 * {
 *   overlayIds: string[]
 * }
 *
 * 응답: 성공/실패 상태
 *
 * 용도: 선택 삭제 모드에서 여러 카드 한 번에 삭제
 */

import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getKeywordStockOverlays,
  removeStockOverlaysBatch,
} from '@/lib/db/queries'
import {
  createSuccessResponse,
  createErrorResponse,
  validateApiAuth,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

interface BatchDeleteRequest {
  overlayIds: string[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof Response) {
      return authResult
    }

    const { keywordId } = await params

    // 요청 본문 파싱
    const body = (await request.json()) as BatchDeleteRequest
    const { overlayIds } = body

    // 요청 검증
    if (!Array.isArray(overlayIds) || overlayIds.length === 0) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'overlayIds 배열이 필요합니다.',
        400
      )
    }

    if (overlayIds.length > 100) {
      return createErrorResponse(
        'INVALID_REQUEST',
        '최대 100개까지만 삭제 가능합니다.',
        400
      )
    }

    console.log(
      `[batch-delete] 배치 삭제 시작: keywordId=${keywordId}, overlayIds=${overlayIds.length}개`
    )

    const overlays = await getKeywordStockOverlays(keywordId, supabase)
    const ownedOverlayIds = new Set(overlays.map(overlay => overlay.id))
    const validOverlayIds = overlayIds.filter(id => ownedOverlayIds.has(id))

    if (validOverlayIds.length !== overlayIds.length) {
      return createErrorResponse(
        'NOT_FOUND',
        '삭제할 수 없는 오버레이가 포함되어 있습니다.',
        404
      )
    }

    // 배치 삭제 API 호출
    try {
      const success = await removeStockOverlaysBatch(validOverlayIds, supabase)

      if (!success) {
        return createErrorResponse(
          'DELETE_FAILED',
          '일부 오버레이 삭제에 실패했습니다.',
          500
        )
      }

      console.log(`[batch-delete] 배치 삭제 완료: ${validOverlayIds.length}개`)

      return createSuccessResponse(
        {
          deletedCount: validOverlayIds.length,
        },
        200
      )
    } catch (error) {
      console.error('[batch-delete] 배치 삭제 실패:', error)
      return createErrorResponse(
        'DELETE_FAILED',
        '오버레이 삭제 중 오류가 발생했습니다.',
        500,
        { message: error instanceof Error ? error.message : 'Unknown error' }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[batch-delete] 에러:', error)

    return createErrorResponse(
      'BATCH_DELETE_FAILED',
      '배치 삭제 중 오류가 발생했습니다.',
      500,
      { message }
    )
  }
}
