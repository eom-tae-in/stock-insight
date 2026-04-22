/**
 * RESTful keyword analyses route.
 *
 * GET /api/keywords/[keywordId]/analyses?region=GLOBAL&period=5Y&searchType=WEB
 * POST /api/keywords/[keywordId]/analyses
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  createSuccessResponse,
  validateApiAuth,
} from '@/lib/api-helpers'
import {
  AnalysisServiceError,
  createKeywordAnalysisForKeyword,
  getKeywordAnalysis,
  getKeywordAnalysesList,
} from '@/server/keyword-analyses-service'
import type { Period, Region, SearchType } from '@/types/database'

export const dynamic = 'force-dynamic'

function handleAnalysisError(error: unknown, fallbackMessage: string) {
  if (error instanceof AnalysisServiceError) {
    return createErrorResponse(error.code, error.message, error.status)
  }

  console.error(fallbackMessage, error)
  return createErrorResponse('DB_ERROR', fallbackMessage, 500)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { keywordId } = await params
    const { searchParams } = request.nextUrl

    const regionParam = searchParams.get('region')
    const periodParam = searchParams.get('period')
    const searchTypeParam = searchParams.get('searchType')

    if (!regionParam || !periodParam || !searchTypeParam) {
      const analysesList = await getKeywordAnalysesList(
        supabase,
        authResult.userId,
        keywordId
      )
      return createSuccessResponse(analysesList, 200)
    }

    const analysis = await getKeywordAnalysis(
      supabase,
      authResult.userId,
      keywordId,
      regionParam as Region,
      periodParam as Period,
      searchTypeParam as SearchType
    )

    return createSuccessResponse(analysis, 200)
  } catch (error) {
    return handleAnalysisError(error, 'Analysis를 조회하지 못했습니다.')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { keywordId } = await params
    const body = await request.json()
    const result = await createKeywordAnalysisForKeyword(
      supabase,
      authResult.userId,
      keywordId,
      {
        keyword: body.keyword,
        region: body.region,
        period: body.period,
        search_type: body.search_type,
      }
    )

    return createSuccessResponse(result, 201)
  } catch (error) {
    return handleAnalysisError(error, 'Analysis 생성에 실패했습니다.')
  }
}
