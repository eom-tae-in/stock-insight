/**
 * 키워드별 종목 오버레이 API Route
 *
 * GET /api/keyword-searches/[keywordId]/overlays - 오버레이 목록 조회
 * POST /api/keyword-searches/[keywordId]/overlays - 오버레이 추가 (커스텀 차트 저장)
 * PATCH /api/keyword-searches/[keywordId]/overlays - 오버레이 순서 변경
 * Response: ApiResponse<KeywordStockOverlay[]>
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
  { params }: { params: Promise<{ keywordId: string }> }
) {
  try {
    // 인증 검증 (중앙화된 헬퍼 사용)
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult // 에러 응답
    }

    const { keywordId } = await params

    // ID 검증
    if (!keywordId || keywordId.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    // 임시 오버레이 목록 조회
    const { data: overlays, error: overlayError } = await supabase
      .from('keyword_temporary_overlays')
      .select('*')
      .eq('keyword_search_id', keywordId)
      .order('display_order', { ascending: true })

    if (overlayError) throw overlayError

    // 응답 형식 변환 (price_data → chartData)
    const formattedOverlays = (overlays || []).map(overlay => ({
      id: overlay.id,
      ticker: overlay.ticker,
      companyName: overlay.company_name,
      displayOrder: overlay.display_order,
      chartData: (overlay.price_data || []).map(
        (p: { date: string; price: number }) => ({
          date: p.date,
          normalizedPrice: p.price,
          rawPrice: p.price,
        })
      ),
    }))

    return createSuccessResponse(formattedOverlays, 200)
  } catch (error) {
    console.error('Error fetching overlays:', error)
    return createErrorResponse(
      'DB_ERROR',
      '오버레이 목록을 불러오지 못했습니다.',
      500
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  try {
    // 인증 검증
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { keywordId } = await params

    if (!keywordId || keywordId.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    const body = await request.json()
    const { ticker, companyName, priceData } = body as {
      ticker: string
      companyName: string
      priceData: Array<{ date: string; price: number }>
    }

    if (!ticker || !priceData) {
      return createErrorResponse(
        'INVALID_BODY',
        'ticker과 priceData는 필수입니다.',
        400
      )
    }

    const tickerUpper = ticker.toUpperCase()
    console.log(
      `[Overlay POST] Creating temporary overlay for ticker: ${tickerUpper}`
    )

    // 1. 기존 임시 오버레이가 있는지 확인
    const { data: existingOverlay, error: checkError } = await supabase
      .from('keyword_temporary_overlays')
      .select('id')
      .eq('keyword_search_id', keywordId)
      .eq('ticker', tickerUpper)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[Overlay POST] Check error:', checkError)
      throw checkError
    }

    if (existingOverlay) {
      console.log(
        `[Overlay POST] DUPLICATE: ${tickerUpper} already exists in keyword_temporary_overlays`
      )
      return createErrorResponse('DUPLICATE', '이미 추가된 종목입니다.', 409)
    }

    // 2. 새 임시 오버레이 생성 (keyword_temporary_overlays에 저장)
    console.log(
      `[Overlay POST] Creating temporary overlay for keywordId: ${keywordId}, ticker: ${tickerUpper}`
    )

    const { data: newOverlay, error: insertError } = await supabase
      .from('keyword_temporary_overlays')
      .insert({
        keyword_search_id: keywordId,
        ticker: tickerUpper,
        company_name: companyName,
        price_data: priceData,
        display_order: 0,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Overlay POST] Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      })
      return createErrorResponse(
        'DB_ERROR',
        '오버레이 저장에 실패했습니다.',
        500
      )
    }

    console.log(`[Overlay POST] Successfully created overlay: ${newOverlay.id}`)

    // 응답 형식 변환 (price_data → chartData)
    const formattedOverlay = {
      id: newOverlay.id,
      ticker: newOverlay.ticker,
      companyName: newOverlay.company_name,
      displayOrder: newOverlay.display_order,
      chartData: (newOverlay.price_data || []).map(
        (p: { date: string; price: number }) => ({
          date: p.date,
          normalizedPrice: p.price,
          rawPrice: p.price,
        })
      ),
    }

    return createSuccessResponse(formattedOverlay, 201)
  } catch (error) {
    console.error('Error creating overlay:', error)
    return createErrorResponse(
      'DB_ERROR',
      '오버레이 저장 중 오류가 발생했습니다.',
      500
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  try {
    // 인증 검증
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { keywordId } = await params

    if (!keywordId || keywordId.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    const body = await request.json()
    const { orderedIds } = body as { orderedIds: string[] }

    if (!Array.isArray(orderedIds)) {
      return createErrorResponse(
        'INVALID_BODY',
        'orderedIds는 배열이어야 합니다.',
        400
      )
    }

    // 임시 오버레이의 display_order 업데이트
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('keyword_temporary_overlays')
        .update({ display_order: index })
        .eq('id', id)
        .eq('keyword_search_id', keywordId)
    )

    const results = await Promise.all(updates)

    // 에러 확인
    for (const result of results) {
      if (result.error) {
        console.error('Update error:', result.error)
        return createErrorResponse(
          'DB_ERROR',
          '순서 업데이트에 실패했습니다.',
          500
        )
      }
    }

    // 업데이트된 오버레이 목록 반환
    const { data: overlays, error: overlayError } = await supabase
      .from('keyword_temporary_overlays')
      .select('*')
      .eq('keyword_search_id', keywordId)
      .order('display_order', { ascending: true })

    if (overlayError) throw overlayError

    // 응답 형식 변환 (price_data → chartData)
    const formattedOverlays = (overlays || []).map(overlay => ({
      id: overlay.id,
      ticker: overlay.ticker,
      companyName: overlay.company_name,
      displayOrder: overlay.display_order,
      chartData: (overlay.price_data || []).map(
        (p: { date: string; price: number }) => ({
          date: p.date,
          normalizedPrice: p.price,
          rawPrice: p.price,
        })
      ),
    }))

    return createSuccessResponse(formattedOverlays, 200)
  } catch (error) {
    console.error('Error updating overlay order:', error)
    return createErrorResponse(
      'DB_ERROR',
      '순서 업데이트 중 오류가 발생했습니다.',
      500
    )
  }
}
