/**
 * Keyword Analysis API
 *
 * GET /api/keyword-analysis
 * Query: ?keywordId=<id>&region=GLOBAL&period=5Y&searchType=WEB
 * Response: KeywordAnalysis | null
 *
 * POST /api/keyword-analysis
 * Body: {
 *   keyword_id: string,
 *   region: 'GLOBAL' | 'US' | 'KR' | 'JP' | 'CN',
 *   period: '1Y' | '3Y' | '5Y',
 *   search_type: 'WEB' | 'YOUTUBE',
 *   trends_data?: TrendsDataPoint[],
 *   ma13_data?: number,
 *   yoy_data?: number
 * }
 * Response: { id: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getKeywordAnalysisByFilters,
  createKeywordAnalysis,
} from '@/lib/db/queries'
import {
  createErrorResponse,
  validateApiAuth,
  createSuccessResponse,
} from '@/lib/api-helpers'
import type { Region, Period, SearchType } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { userId } = authResult

    // 쿼리 파라미터 추출
    const { searchParams } = request.nextUrl
    const keywordId = searchParams.get('keywordId')
    const region = searchParams.get('region') || 'GLOBAL'
    const period = searchParams.get('period') || '5Y'
    const searchType = searchParams.get('searchType') || 'WEB'

    // 필수 파라미터 검증
    if (!keywordId) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'keywordId가 필요합니다.',
        400
      )
    }

    // analysis 조회
    const analysis = await getKeywordAnalysisByFilters(
      keywordId,
      region as Region,
      period as Period,
      searchType as SearchType,
      userId,
      supabase
    )

    if (!analysis) {
      return createSuccessResponse(null, 200)
    }

    return createSuccessResponse(analysis, 200)
  } catch (error) {
    console.error('[GET /api/keyword-analysis] Error:', error)
    return createErrorResponse(
      'DB_ERROR',
      'Analysis를 조회하지 못했습니다.',
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

    const body = await request.json()
    const {
      keyword_id,
      region = 'GLOBAL',
      period = '5Y',
      search_type = 'WEB',
      trends_data = [],
      ma13_data,
      yoy_data,
    } = body

    // 필수 필드 검증
    if (!keyword_id) {
      return createErrorResponse(
        'INVALID_INPUT',
        'keyword_id가 필요합니다.',
        400
      )
    }

    // analysis 생성
    const analysisId = await createKeywordAnalysis(
      {
        keyword_id,
        region: region as Region,
        period: period as Period,
        search_type: search_type as SearchType,
        trends_data,
        ma13_data,
        yoy_data,
      },
      supabase
    )

    console.log('[POST /api/keyword-analysis] Analysis created:', analysisId)

    return createSuccessResponse({ id: analysisId }, 201)
  } catch (error) {
    console.error('[POST /api/keyword-analysis] Error:', error)
    return createErrorResponse('DB_ERROR', 'Analysis 생성에 실패했습니다.', 500)
  }
}
