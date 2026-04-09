/**
 * Keyword Analysis Detail API
 *
 * GET /api/keyword-analysis/[analysisId]
 * Response: KeywordAnalysis
 *
 * PATCH /api/keyword-analysis/[analysisId]
 * Body: {
 *   trends_data?: TrendsDataPoint[],
 *   ma13_data?: number,
 *   yoy_data?: number
 * }
 * Response: { success: boolean }
 *
 * DELETE /api/keyword-analysis/[analysisId]
 * Response: { success: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getKeywordAnalysisByFilters,
  updateKeywordAnalysis,
  deleteKeywordAnalysis,
} from '@/lib/db/queries'
import {
  createErrorResponse,
  validateApiAuth,
  createSuccessResponse,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { analysisId } = await params

    // 직접 조회 (RLS를 통해 자동으로 필터링)
    const { data, error } = await supabase
      .from('keyword_analysis')
      .select('*')
      .eq('id', analysisId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) {
      return createErrorResponse(
        'NOT_FOUND',
        'Analysis를 찾을 수 없습니다.',
        404
      )
    }

    const analysis = {
      id: data.id,
      keyword_id: data.keyword_id,
      region: data.region,
      period: data.period,
      search_type: data.search_type,
      trends_data: data.trends_data,
      ma13_data: data.ma13_data,
      yoy_data: data.yoy_data,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return createSuccessResponse(analysis, 200)
  } catch (error) {
    console.error('[GET /api/keyword-analysis/[analysisId]] Error:', error)
    return createErrorResponse(
      'DB_ERROR',
      'Analysis를 조회하지 못했습니다.',
      500
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { analysisId } = await params
    const body = await request.json()

    // analysis 업데이트
    await updateKeywordAnalysis(analysisId, body, supabase)

    console.log(
      '[PATCH /api/keyword-analysis/[analysisId]] Updated:',
      analysisId
    )

    return createSuccessResponse({ success: true }, 200)
  } catch (error) {
    console.error('[PATCH /api/keyword-analysis/[analysisId]] Error:', error)
    return createErrorResponse(
      'DB_ERROR',
      'Analysis 업데이트에 실패했습니다.',
      500
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { analysisId } = await params

    // analysis 삭제
    await deleteKeywordAnalysis(analysisId, supabase)

    console.log(
      '[DELETE /api/keyword-analysis/[analysisId]] Deleted:',
      analysisId
    )

    return createSuccessResponse({ success: true }, 200)
  } catch (error) {
    console.error('[DELETE /api/keyword-analysis/[analysisId]] Error:', error)
    return createErrorResponse('DB_ERROR', 'Analysis 삭제에 실패했습니다.', 500)
  }
}
