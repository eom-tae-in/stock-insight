/**
 * Overlay 최신화 API (주가 데이터 재조회)
 * POST /api/keyword-searches/[keywordId]/overlays/[overlayId]/refresh
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  insertOverlayChartTimeseries,
  getKeywordStockOverlays,
} from '@/lib/db/queries'
import {
  createErrorResponse,
  validateApiAuth,
  createSuccessResponse,
} from '@/lib/api-helpers'
import { fetchStockData } from '@/lib/services/stock-service'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ keywordId: string; overlayId: string }> }
) {
  try {
    // 인증 검증
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { keywordId, overlayId } = await params

    if (!overlayId) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    // 오버레이 정보 조회 (ticker 필요)
    const overlays = await getKeywordStockOverlays(keywordId, supabase)
    const overlay = overlays.find(o => o.id === overlayId)

    if (!overlay) {
      return createErrorResponse(
        'NOT_FOUND',
        '오버레이를 찾을 수 없습니다.',
        404
      )
    }

    const stockData = await fetchStockData(overlay.ticker)
    const prices = stockData.priceData.map(point => point.close)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice

    const overlayData = stockData.priceData.map(point => ({
      date: point.date,
      normalizedPrice:
        priceRange > 0 ? ((point.close - minPrice) / priceRange) * 100 : 50,
      rawPrice: point.close,
    }))

    // DB에 저장
    await insertOverlayChartTimeseries(overlayId, overlayData, supabase)

    return createSuccessResponse(
      { success: true, updated: overlayData.length },
      200
    )
  } catch (error) {
    console.error('Error refreshing overlay:', error)
    return createErrorResponse(
      'REFRESH_FAILED',
      '최신화 중 오류가 발생했습니다.',
      500
    )
  }
}
