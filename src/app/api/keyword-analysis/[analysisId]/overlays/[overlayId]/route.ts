/**
 * Keyword Analysis Stock Overlay Detail API
 *
 * DELETE /api/keyword-analysis/[analysisId]/overlays/[overlayId]
 * Response: { success: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  validateApiAuth,
  createSuccessResponse,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string; overlayId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { overlayId } = await params

    // overlay 삭제
    const { error } = await supabase
      .from('keyword_stock_overlays')
      .delete()
      .eq('id', overlayId)

    if (error) throw error

    console.log(
      '[DELETE /api/keyword-analysis/[analysisId]/overlays/[overlayId]] Deleted:',
      overlayId
    )

    return createSuccessResponse({ success: true }, 200)
  } catch (error) {
    console.error(
      '[DELETE /api/keyword-analysis/[analysisId]/overlays/[overlayId]] Error:',
      error
    )
    return createErrorResponse('DB_ERROR', 'Overlay 삭제에 실패했습니다.', 500)
  }
}
