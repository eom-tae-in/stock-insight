/**
 * Keyword Analysis Stock Overlays API
 *
 * GET /api/keyword-analysis/[analysisId]/overlays?keywordId=xxx
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
 *
 * PATCH /api/keyword-analysis/[analysisId]/overlays
 * Body: {
 *   overlays: Array<{ id: string, display_order: number }>
 * }
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

async function isOwnedSearch(
  supabase: SupabaseClient,
  searchId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('searches')
    .select('id')
    .eq('id', searchId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return Boolean(data)
}

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
    const { userId } = authResult

    const { analysisId } = await params
    const ownsAnalysis = await isOwnedAnalysis(supabase, analysisId, userId)
    if (!ownsAnalysis) {
      return createErrorResponse(
        'NOT_FOUND',
        'Analysis를 찾을 수 없습니다.',
        404
      )
    }

    // analysis_id 기준 overlays 조회
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
    const { userId } = authResult

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

    const ownsAnalysis = await isOwnedAnalysis(supabase, analysisId, userId)
    if (!ownsAnalysis) {
      return createErrorResponse(
        'NOT_FOUND',
        'Analysis를 찾을 수 없습니다.',
        404
      )
    }

    const ownsSearch = await isOwnedSearch(supabase, search_id, userId)
    if (!ownsSearch) {
      return createErrorResponse('NOT_FOUND', '종목을 찾을 수 없습니다.', 404)
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

    // overlay 추가 (analysis_id 기준)
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
    const { userId } = authResult

    const { analysisId } = await params
    const body = await request.json()
    const { overlays } = body

    const ownsAnalysis = await isOwnedAnalysis(supabase, analysisId, userId)
    if (!ownsAnalysis) {
      return createErrorResponse(
        'NOT_FOUND',
        'Analysis를 찾을 수 없습니다.',
        404
      )
    }

    // 필수 필드 검증
    if (!Array.isArray(overlays) || overlays.length === 0) {
      return createErrorResponse(
        'INVALID_INPUT',
        '올바른 overlays 배열이 필요합니다.',
        400
      )
    }

    // 각 overlay 검증
    for (const item of overlays) {
      if (!item.id || typeof item.display_order !== 'number') {
        return createErrorResponse(
          'INVALID_INPUT',
          '각 overlay는 id와 display_order를 포함해야 합니다.',
          400
        )
      }
    }

    // 병렬로 display_order 업데이트
    const updatePromises = overlays.map(
      ({ id, display_order }) =>
        supabase
          .from('keyword_stock_overlays')
          .update({ display_order })
          .eq('id', id)
          .eq('analysis_id', analysisId) // 보안: 같은 analysis 확인
    )

    const results = await Promise.all(updatePromises)

    // 에러 확인
    for (const result of results) {
      if (result.error) throw result.error
    }

    console.log(
      '[PATCH /api/keyword-analysis/[analysisId]/overlays] Updated:',
      overlays.length,
      'overlays'
    )

    return createSuccessResponse({ success: true }, 200)
  } catch (error) {
    console.error(
      '[PATCH /api/keyword-analysis/[analysisId]/overlays] Error:',
      error
    )
    return createErrorResponse(
      'DB_ERROR',
      'Overlay 순서 변경에 실패했습니다.',
      500
    )
  }
}
