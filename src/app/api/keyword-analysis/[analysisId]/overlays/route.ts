/**
 * Keyword Analysis Stock Overlays API
 *
 * GET /api/keyword-analysis/[analysisId]/overlays?keywordId=xxx
 * Response: KeywordAnalysisOverlay[]
 *
 * POST /api/keyword-analysis/[analysisId]/overlays
 * Body: {
 *   ticker: string,
 *   company_name: string,
 *   price_data?: Array<{ date: string, price: number }>,
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

function normalizeTicker(ticker: unknown): string | null {
  if (typeof ticker !== 'string') return null

  const normalized = ticker.trim().toUpperCase()
  return normalized.length > 0 ? normalized : null
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
      .select('*, overlay_chart_timeseries(date, normalized_price, raw_price)')
      .eq('analysis_id', analysisId)
      .order('display_order', { ascending: true })

    if (error) throw error

    const overlays = (data || []).map(row => ({
      id: row.id,
      analysis_id: row.analysis_id,
      ticker: row.ticker,
      company_name: row.company_name,
      display_order: row.display_order,
      created_at: row.created_at,
      chart_data: (row.overlay_chart_timeseries || [])
        .map(
          (point: {
            date: string
            normalized_price: number | null
            raw_price: number | null
          }) => ({
            date: point.date,
            normalizedPrice: point.normalized_price,
            rawPrice: point.raw_price,
          })
        )
        .sort((a: { date: string }, b: { date: string }) =>
          a.date.localeCompare(b.date)
        ),
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
    const { company_name, display_order } = body
    const ticker = normalizeTicker(body.ticker)

    // 필수 필드 검증
    if (!ticker || typeof company_name !== 'string' || !company_name.trim()) {
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
        ticker,
        company_name: company_name.trim(),
        display_order: display_order ?? nextOrder,
      })
      .select('id')
      .single()

    if (error?.code === '23505') {
      return createErrorResponse('DUPLICATE', '이미 추가된 종목입니다.', 409)
    }
    if (error) throw error

    const priceData = Array.isArray(body.price_data) ? body.price_data : []
    if (priceData.length > 0) {
      const prices = priceData
        .map((point: { price?: unknown }) => point.price)
        .filter((price: unknown): price is number => typeof price === 'number')

      if (prices.length > 0) {
        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        const priceRange = maxPrice - minPrice

        const records = priceData
          .filter(
            (point: { date?: unknown; price?: unknown }) =>
              typeof point.date === 'string' && typeof point.price === 'number'
          )
          .map((point: { date: string; price: number }) => ({
            overlay_id: data.id,
            date: point.date,
            raw_price: point.price,
            normalized_price:
              priceRange > 0
                ? ((point.price - minPrice) / priceRange) * 100
                : 50,
          }))

        if (records.length > 0) {
          const { error: timeseriesError } = await supabase
            .from('overlay_chart_timeseries')
            .insert(records)

          if (timeseriesError) {
            await supabase
              .from('keyword_stock_overlays')
              .delete()
              .eq('id', data.id)
            throw timeseriesError
          }
        }
      }
    }

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
