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
import YahooFinance from 'yahoo-finance2'

export const dynamic = 'force-dynamic'

const yf = new YahooFinance()

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

    // yahoo-finance2로 주가 데이터 조회
    const quoteData = await yf.quote(overlay.ticker)

    if (!quoteData || !quoteData.regularMarketPrice) {
      return createErrorResponse(
        'QUOTE_FAILED',
        '주가 데이터를 조회할 수 없습니다.',
        500
      )
    }

    const currentPrice = quoteData.regularMarketPrice

    // 정규화를 위해 52주 가격 범위 사용
    const fiftyTwoWeekLow = quoteData.fiftyTwoWeekLow ?? currentPrice * 0.8
    const fiftyTwoWeekHigh = quoteData.fiftyTwoWeekHigh ?? currentPrice * 1.2

    const priceRange = fiftyTwoWeekHigh - fiftyTwoWeekLow

    // 정규화된 데이터 생성
    const normalizedPrice =
      priceRange > 0
        ? ((currentPrice - fiftyTwoWeekLow) / priceRange) * 100
        : 50

    // 현재 데이터 저장
    const today = new Date().toISOString().split('T')[0]
    const overlayData = [
      {
        date: today,
        normalizedPrice: Math.max(0, Math.min(100, normalizedPrice)),
        rawPrice: currentPrice,
      },
    ]

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
