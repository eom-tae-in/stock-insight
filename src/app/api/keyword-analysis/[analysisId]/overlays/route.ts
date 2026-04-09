/**
 * Keyword Analysis Stock Overlays API
 *
 * GET /api/keyword-analysis/[analysisId]/overlays
 * Response: KeywordAnalysisOverlay[]
 *
 * POST /api/keyword-analysis/[analysisId]/overlays
 * Body: {
 *   search_id: string,
 *   ticker: string,
 *   company_name: string,
 *   display_order?: number
 * }
 * Response: { id: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
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

    // analysis 기준 overlays 조회
    const { data, error } = await supabase
      .from('keyword_stock_overlays')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('display_order', { ascending: true })

    if (error) throw error

    const overlays = (data || []).map(row => ({
      id: row.id,
      analysis_id: row.analysis_id,
      search_id: row.search_id,
      ticker: row.ticker,
      company_name: row.company_name,
      display_order: row.display_order,
      created_at: row.created_at,
    }))

    return createSuccessResponse(overlays, 200)
  } catch (error) {
    console.error(
      '[GET /api/keyword-analysis/[analysisId]/overlays] Error:',
      error
    )
    return createErrorResponse(
      'DB_ERROR',
      'Overlays를 조회하지 못했습니다.',
      500
    )
  }
}

export async function POST(
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
    const { search_id, ticker, company_name, display_order } = body

    // 필수 필드 검증
    if (!search_id || !ticker || !company_name) {
      return createErrorResponse(
        'INVALID_INPUT',
        '필수 필드가 누락되었습니다.',
        400
      )
    }

    // 최대 display_order 조회
    const { data: maxData } = await supabase
      .from('keyword_stock_overlays')
      .select('display_order')
      .eq('analysis_id', analysisId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder =
      maxData && maxData.length > 0 ? maxData[0].display_order + 1 : 1

    // overlay 추가
    const { data, error } = await supabase
      .from('keyword_stock_overlays')
      .insert({
        analysis_id: analysisId,
        search_id,
        ticker: ticker.toUpperCase(),
        company_name,
        display_order: display_order ?? nextOrder,
      })
      .select('id')
      .single()

    if (error) throw error

    console.log(
      '[POST /api/keyword-analysis/[analysisId]/overlays] Overlay created:',
      data.id
    )

    return createSuccessResponse({ id: data.id }, 201)
  } catch (error) {
    console.error(
      '[POST /api/keyword-analysis/[analysisId]/overlays] Error:',
      error
    )
    return createErrorResponse('DB_ERROR', 'Overlay 추가에 실패했습니다.', 500)
  }
}
