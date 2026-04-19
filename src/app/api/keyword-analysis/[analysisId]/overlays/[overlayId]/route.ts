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
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function isOwnedAnalysis(
  supabase: SupabaseClient,
  analysisId: string,
  userId: string
): Promise<boolean> {
  const { data: analysis, error: analysisError } = await supabase
    .from('keyword_analysis')
    .select('keyword_id')
    .eq('id', analysisId)
    .single()

  if (analysisError && analysisError.code !== 'PGRST116') throw analysisError
  if (!analysis) return false

  const { data: keyword, error: keywordError } = await supabase
    .from('keywords')
    .select('id')
    .eq('id', analysis.keyword_id)
    .eq('user_id', userId)
    .single()

  if (keywordError && keywordError.code !== 'PGRST116') throw keywordError
  return Boolean(keyword)
}

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
    const { userId } = authResult

    const { analysisId, overlayId } = await params

    const ownsAnalysis = await isOwnedAnalysis(supabase, analysisId, userId)
    if (!ownsAnalysis) {
      return createErrorResponse(
        'NOT_FOUND',
        'Analysis를 찾을 수 없습니다.',
        404
      )
    }

    // overlay 삭제
    const { error } = await supabase
      .from('keyword_stock_overlays')
      .delete()
      .eq('id', overlayId)
      .eq('analysis_id', analysisId)

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
