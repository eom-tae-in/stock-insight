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
import {
  addStockOverlay,
  getKeywordStockOverlays,
  getOverlayChartTimeseries,
  insertOverlayChartTimeseries,
  updateStockOverlayOrder,
} from '@/lib/db/queries'
import { fetchStockData } from '@/lib/services/stock-service'

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

    const overlays = await getKeywordStockOverlays(keywordId, supabase)

    const formattedOverlays = await Promise.all(
      overlays.map(async overlay => ({
        id: overlay.id,
        keyword_search_id: keywordId,
        search_id: overlay.search_id ?? null,
        ticker: overlay.ticker,
        company_name: overlay.company_name,
        companyName: overlay.company_name,
        display_order: overlay.display_order,
        displayOrder: overlay.display_order,
        created_at: overlay.created_at,
        chartData: await getOverlayChartTimeseries(overlay.id, supabase),
      }))
    )

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
    const { ticker, priceData } = body as {
      ticker: string
      companyName?: string
      company_name?: string
      priceData?: Array<{ date: string; price: number }>
    }
    const companyName = body.companyName ?? body.company_name ?? ticker

    if (!ticker) {
      return createErrorResponse('INVALID_BODY', 'ticker는 필수입니다.', 400)
    }

    const tickerUpper = ticker.toUpperCase()
    console.log(
      `[Overlay POST] Creating temporary overlay for ticker: ${tickerUpper}`
    )

    const overlayId = await addStockOverlay(
      keywordId,
      '',
      tickerUpper,
      companyName,
      0,
      supabase
    )

    let resolvedPriceData = priceData
    if (!resolvedPriceData || resolvedPriceData.length === 0) {
      const stockData = await fetchStockData(tickerUpper)
      resolvedPriceData = stockData.priceData.map(point => ({
        date: point.date,
        price: point.close,
      }))
    }

    if (resolvedPriceData.length > 0) {
      const prices = resolvedPriceData.map(point => point.price)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const range = maxPrice - minPrice

      await insertOverlayChartTimeseries(
        overlayId,
        resolvedPriceData.map(point => ({
          date: point.date,
          rawPrice: point.price,
          normalizedPrice:
            range > 0 ? ((point.price - minPrice) / range) * 100 : 50,
        })),
        supabase
      )
    }

    console.log(`[Overlay POST] Successfully created overlay: ${overlayId}`)

    const formattedOverlay = {
      id: overlayId,
      ticker: tickerUpper,
      companyName,
      displayOrder: 0,
      chartData: await getOverlayChartTimeseries(overlayId, supabase),
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

    for (let index = 0; index < orderedIds.length; index++) {
      const updated = await updateStockOverlayOrder(
        orderedIds[index],
        index,
        supabase
      )
      if (!updated) {
        return createErrorResponse(
          'DB_ERROR',
          '순서 업데이트에 실패했습니다.',
          500
        )
      }
    }

    const overlays = await getKeywordStockOverlays(keywordId, supabase)

    const formattedOverlays = await Promise.all(
      overlays.map(async overlay => ({
        id: overlay.id,
        ticker: overlay.ticker,
        companyName: overlay.company_name,
        displayOrder: overlay.display_order,
        chartData: await getOverlayChartTimeseries(overlay.id, supabase),
      }))
    )

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
