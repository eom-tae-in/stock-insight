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
import { calculateTrendsMA13 } from '@/lib/indicators'
import type {
  Region,
  Period,
  SearchType,
  TrendsDataPoint,
} from '@/types/database'

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
    const region = (searchParams.get('region') as Region) || 'GLOBAL'
    const period = (searchParams.get('period') as Period) || '5Y'
    const searchType = (searchParams.get('searchType') as SearchType) || 'WEB'

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
      keyword,
      region = 'GLOBAL',
      period = '5Y',
      search_type = 'WEB',
    } = body

    // 필수 필드 검증
    if (!keyword_id) {
      return createErrorResponse(
        'INVALID_INPUT',
        'keyword_id가 필요합니다.',
        400
      )
    }

    if (!keyword) {
      return createErrorResponse('INVALID_INPUT', 'keyword가 필요합니다.', 400)
    }

    // region -> geo 매핑
    const geoMap: Record<string, string> = {
      GLOBAL: '',
      US: 'US',
      KR: 'KR',
      JP: 'JP',
      CN: 'CN',
    }
    const geo = geoMap[region] || ''

    // search_type -> gprop 매핑
    const gpropMap: Record<string, string> = {
      WEB: '',
      YOUTUBE: 'youtube',
    }
    const gprop = gpropMap[search_type] || ''

    // period 매핑
    const timeframe = period.toLowerCase() // '5Y' -> '5y'

    // trends_data 조회
    let trendsData: Array<{
      date: string
      value: number
      ma13Value: number | null
      yoyValue: number | null
    }> = []
    try {
      const trendsResponse = await fetch(
        `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/trends-internal`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyword,
            geo,
            timeframe,
            gprop,
          }),
        }
      )

      console.log(
        '[POST /api/keyword-analysis] Trends response status:',
        trendsResponse.status
      )

      if (trendsResponse.ok) {
        const trendsRawData = await trendsResponse.json()
        console.log(
          '[POST /api/keyword-analysis] Trends raw data length:',
          Array.isArray(trendsRawData) ? trendsRawData.length : 'not array'
        )
        console.log(
          '[POST /api/keyword-analysis] Trends raw data sample:',
          Array.isArray(trendsRawData)
            ? trendsRawData.slice(0, 2)
            : trendsRawData
        )

        // TrendsDataPoint 형태로 변환
        const trendPoints: TrendsDataPoint[] = (trendsRawData || []).map(
          (point: { date: string; value: number }) => ({
            date: point.date,
            value: point.value || 0,
          })
        )

        console.log(
          '[POST /api/keyword-analysis] Trend points created:',
          trendPoints.length
        )

        // ma13 계산
        const ma13Values = calculateTrendsMA13(trendPoints)

        // yoy 배열 계산 (52주 기준)
        const yoyValuesArray = trendPoints.map((point, idx) => {
          if (idx < 52) return null
          const currentValue = point.value
          const previousYearValue = trendPoints[idx - 52].value
          if (previousYearValue === 0) return null
          return ((currentValue - previousYearValue) / previousYearValue) * 100
        })

        // 계산된 값과 함께 trendsData 구성
        trendsData = trendPoints.map((point, idx) => ({
          date: point.date,
          value: point.value,
          ma13Value: ma13Values[idx] ?? null,
          yoyValue: yoyValuesArray[idx] ?? null,
        }))
      }
    } catch (trendsError) {
      console.error(
        '[POST /api/keyword-analysis] Trends fetch error:',
        trendsError
      )
      // trends 데이터 실패해도 계속 진행
    }

    // ma13_data, yoy_data 추출 (trends_data의 마지막 값)
    const lastTrendPoint = trendsData[trendsData.length - 1]
    const ma13DataValue = lastTrendPoint?.ma13Value ?? undefined
    const yoyDataValue = lastTrendPoint?.yoyValue ?? undefined

    // analysis 생성
    const analysisId = await createKeywordAnalysis(
      {
        keyword_id,
        region: region as Region,
        period: period as Period,
        search_type: search_type as SearchType,
        trends_data: trendsData,
        ma13_data: ma13DataValue,
        yoy_data: yoyDataValue,
      },
      supabase
    )

    console.log('[POST /api/keyword-analysis] Analysis created:', analysisId)
    console.log(
      '[POST /api/keyword-analysis] ma13_data:',
      ma13DataValue,
      ', yoy_data:',
      yoyDataValue
    )

    return createSuccessResponse(
      {
        id: analysisId,
        trends_data: trendsData,
      },
      201
    )
  } catch (error) {
    console.error('[POST /api/keyword-analysis] Error:', error)
    return createErrorResponse('DB_ERROR', 'Analysis 생성에 실패했습니다.', 500)
  }
}
