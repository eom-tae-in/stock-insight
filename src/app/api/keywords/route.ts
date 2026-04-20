import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  createSuccessResponse,
  validateApiAuth,
} from '@/lib/api-helpers'
import {
  getKeywords,
  upsertKeyword,
  updateKeyword,
} from '@/server/keywords-service'
import {
  addStockOverlay,
  createKeywordAnalysis,
  insertOverlayChartTimeseries,
} from '@/lib/db/queries'
import type { Period, Region, SearchType } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const keywords = await getKeywords(supabase, authResult.userId)
    return createSuccessResponse(keywords, 200)
  } catch (error) {
    console.error('Error fetching keywords:', error)
    return createErrorResponse(
      'DB_ERROR',
      '키워드 목록을 불러오지 못했습니다.',
      500
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body: {
      keyword?: string
      region?: Region
      search_type?: SearchType
      chartData?: Array<{
        date: string
        trendsValue: number
        ma13Value: number | null
        yoyValue: number | null
      }>
      overlays?: Array<{
        ticker: string
        companyName: string
        overlayData: Array<{
          date: string
          normalizedPrice: number
          rawPrice: number
        }>
      }>
    } = await request.json()

    const keyword = await upsertKeyword(
      supabase,
      authResult.userId,
      body.keyword ?? ''
    )
    const region = body.region ?? 'GLOBAL'
    const searchType = body.search_type ?? 'WEB'
    const period: Period = '5Y'

    if (body.chartData && body.chartData.length > 0) {
      await createKeywordAnalysis(
        {
          keyword_id: keyword.id,
          region,
          period,
          search_type: searchType,
          trends_data: body.chartData.map(point => ({
            date: point.date,
            value: point.trendsValue,
            ma13Value: point.ma13Value,
            yoyValue: point.yoyValue,
          })),
          ma13_data: body.chartData.at(-1)?.ma13Value ?? undefined,
          yoy_data: body.chartData.at(-1)?.yoyValue ?? undefined,
        },
        supabase
      )
    }

    if (body.overlays && body.overlays.length > 0) {
      for (let i = 0; i < body.overlays.length; i++) {
        const overlay = body.overlays[i]
        const overlayId = await addStockOverlay(
          keyword.id,
          overlay.ticker,
          overlay.companyName,
          i,
          supabase
        )

        if (overlay.overlayData.length > 0) {
          await insertOverlayChartTimeseries(
            overlayId,
            overlay.overlayData,
            supabase
          )
        }
      }
    }

    return createSuccessResponse(
      {
        id: keyword.id,
        keyword: keyword.keyword,
      },
      201
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'KEYWORD_REQUIRED') {
      return createErrorResponse('INVALID_INPUT', '키워드가 필요합니다.', 400)
    }

    console.error('Error creating keyword:', error)
    return createErrorResponse(
      'DB_ERROR',
      '키워드 저장 중 오류가 발생했습니다.',
      500
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = await request.json()
    const { id, keyword } = body

    if (!id) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    const updatedKeyword = await updateKeyword(
      supabase,
      authResult.userId,
      id,
      keyword
    )

    if (!updatedKeyword) {
      return createErrorResponse(
        'NOT_FOUND',
        '해당 키워드를 찾을 수 없습니다.',
        404
      )
    }

    return createSuccessResponse(updatedKeyword, 200)
  } catch (error) {
    if (error instanceof Error && error.message === 'KEYWORD_REQUIRED') {
      return createErrorResponse('INVALID_INPUT', '키워드가 필요합니다.', 400)
    }

    console.error('Error updating keyword:', error)
    return createErrorResponse(
      'DB_ERROR',
      '키워드 수정 중 오류가 발생했습니다.',
      500
    )
  }
}
