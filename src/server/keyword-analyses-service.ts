import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createKeywordAnalysis,
  deleteKeywordAnalysis,
  getKeywordAnalysisByFilters,
  updateKeywordAnalysis,
} from '@/lib/db/queries'
import {
  buildTrendsDataWithIndicators,
  fetchInternalTrendsData,
  TrendsProviderError,
} from '@/server/trends-internal-service'
import { parsePytrendsParams } from '@/lib/parsers/trends-parsers'
import type {
  KeywordAnalysis,
  Period,
  Region,
  SearchType,
  TrendsDataPoint,
} from '@/types/database'

export class AnalysisServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
  }
}

type AnalysisCreateInput = {
  keyword?: string
  region?: Region
  search_type?: SearchType
}

type AnalysisUpdateInput = Partial<{
  trends_data: TrendsDataPoint[]
  ma13_data: number
  yoy_data: number
}>

type AnalysisRow = {
  id: string
  keyword_id: string
  region: Region
  period: Period
  search_type: SearchType
  trends_data: TrendsDataPoint[]
  ma13_data?: number
  yoy_data?: number
  created_at: string
  updated_at?: string
}

function toAnalysis(row: AnalysisRow): KeywordAnalysis {
  return {
    id: row.id,
    keyword_id: row.keyword_id,
    region: row.region,
    period: row.period,
    search_type: row.search_type,
    trends_data: row.trends_data,
    ma13_data: row.ma13_data,
    yoy_data: row.yoy_data,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

async function getOwnedKeywordName(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string
) {
  const { data, error } = await supabase
    .from('keywords')
    .select('name')
    .eq('id', keywordId)
    .eq('user_id', userId)
    .single()

  if (error?.code === 'PGRST116') {
    throw new AnalysisServiceError(
      'NOT_FOUND',
      '키워드를 찾을 수 없습니다.',
      404
    )
  }

  if (error) throw error
  return data.name as string
}

export async function getKeywordAnalysis(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string,
  region: Region = 'GLOBAL',
  period: Period = '5Y',
  searchType: SearchType = 'WEB'
) {
  if (!keywordId) {
    throw new AnalysisServiceError(
      'INVALID_REQUEST',
      'keywordId가 필요합니다.',
      400
    )
  }

  return getKeywordAnalysisByFilters(
    keywordId,
    region,
    period,
    searchType,
    userId,
    supabase
  )
}

export async function getKeywordAnalysesList(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string
): Promise<
  Array<{
    id: string
    keyword_id: string
    region: Region
    period: Period
    search_type: SearchType
    trends_data: TrendsDataPoint[]
    ma13_data?: number
    yoy_data?: number
    display_order?: number
    created_at?: string
    updated_at?: string
  }>
> {
  if (!keywordId) {
    throw new AnalysisServiceError(
      'INVALID_REQUEST',
      'keywordId가 필요합니다.',
      400
    )
  }

  const { getKeywordAnalysesByKeywordId } = await import('@/lib/db/queries')

  const analyses = await getKeywordAnalysesByKeywordId(
    keywordId,
    userId,
    supabase
  )

  return analyses.filter(analysis => analysis.period === '5Y')
}

export async function createKeywordAnalysisForKeyword(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string,
  input: AnalysisCreateInput
) {
  if (!keywordId) {
    throw new AnalysisServiceError(
      'INVALID_INPUT',
      'keyword_id가 필요합니다.',
      400
    )
  }

  const keyword =
    input.keyword ?? (await getOwnedKeywordName(supabase, userId, keywordId))

  // 분석 원본 데이터 범위는 항상 5Y로 고정한다.
  // 화면의 기간 선택은 저장된 5Y 데이터를 잘라 보는 view filter다.
  const region = input.region
  const period: Period = '5Y'
  const searchType = input.search_type

  if (!region || !searchType) {
    throw new AnalysisServiceError(
      'INVALID_INPUT',
      '분석 필터(region, search_type)는 필수입니다.',
      400
    )
  }

  try {
    const parsed = parsePytrendsParams({
      keyword,
      geo: region,
      timeframe: period,
      gprop: searchType,
    })
    const trendsRawData = await fetchInternalTrendsData({
      keyword: parsed.keyword,
      geo: parsed.geo,
      timeframe: parsed.timeframe,
      gprop: parsed.gprop,
    })

    const trendsData = buildTrendsDataWithIndicators(trendsRawData)
    const lastTrendPoint = trendsData.at(-1)
    const analysisId = await createKeywordAnalysis(
      {
        keyword_id: keywordId,
        region,
        period,
        search_type: searchType,
        trends_data: trendsData,
        ma13_data: lastTrendPoint?.ma13Value ?? undefined,
        yoy_data: lastTrendPoint?.yoyValue ?? undefined,
      },
      supabase
    )

    return {
      id: analysisId,
      trends_data: trendsData,
    }
  } catch (error) {
    console.error('[keyword analyses] Trends fetch error:', error)

    if (error instanceof TrendsProviderError) {
      throw new AnalysisServiceError(
        error.code,
        '트렌드 데이터를 가져오지 못했습니다.',
        error.status
      )
    }

    throw new AnalysisServiceError(
      'TRENDS_FETCH_FAILED',
      '트렌드 데이터를 가져오지 못했습니다.',
      502
    )
  }
}

export async function refreshKeywordAnalysis(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
) {
  const { data: analysis, error: analysisError } = await supabase
    .from('keyword_analysis')
    .select(
      'id, keyword_id, region, period, search_type, keywords!inner(name, user_id)'
    )
    .eq('id', analysisId)
    .single()

  if (analysisError?.code === 'PGRST116' || !analysis) {
    throw new AnalysisServiceError(
      'NOT_FOUND',
      'Analysis를 찾을 수 없습니다.',
      404
    )
  }

  if (analysisError) throw analysisError

  const keyword = Array.isArray(analysis.keywords)
    ? analysis.keywords[0]
    : analysis.keywords

  if (!keyword || keyword.user_id !== userId) {
    throw new AnalysisServiceError(
      'NOT_FOUND',
      'Analysis를 찾을 수 없습니다.',
      404
    )
  }

  try {
    const parsed = parsePytrendsParams({
      keyword: keyword.name,
      geo: analysis.region as Region,
      timeframe: analysis.period as Period,
      gprop: analysis.search_type as SearchType,
    })
    const trendsRawData = await fetchInternalTrendsData({
      keyword: parsed.keyword,
      geo: parsed.geo,
      timeframe: parsed.timeframe,
      gprop: parsed.gprop,
    })
    const trendsData = buildTrendsDataWithIndicators(trendsRawData)
    const lastTrendPoint = trendsData.at(-1)

    const { error: updateError } = await supabase
      .from('keyword_analysis')
      .update({
        trends_data: trendsData,
        ma13_data: lastTrendPoint?.ma13Value ?? null,
        yoy_data: lastTrendPoint?.yoyValue ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', analysisId)

    if (updateError) throw updateError

    const refreshed = await getOwnedAnalysis(supabase, userId, analysisId)
    if (!refreshed) {
      throw new AnalysisServiceError(
        'REFRESH_FAILED',
        '갱신된 Analysis를 다시 조회하지 못했습니다.',
        500
      )
    }

    return refreshed
  } catch (error) {
    console.error('[keyword analyses] Trends refresh error:', error)

    if (error instanceof AnalysisServiceError) throw error

    if (error instanceof TrendsProviderError) {
      throw new AnalysisServiceError(
        error.code,
        '트렌드 데이터를 갱신하지 못했습니다.',
        error.status
      )
    }

    throw new AnalysisServiceError(
      'TRENDS_REFRESH_FAILED',
      '트렌드 데이터를 갱신하지 못했습니다.',
      502
    )
  }
}

export async function refreshDefaultKeywordAnalysis(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string
) {
  const keyword = await getOwnedKeywordName(supabase, userId, keywordId)
  const existingAnalysis = await getKeywordAnalysis(
    supabase,
    userId,
    keywordId,
    'GLOBAL',
    '5Y',
    'WEB'
  )

  if (!existingAnalysis) {
    const created = await createKeywordAnalysisForKeyword(
      supabase,
      userId,
      keywordId,
      {
        keyword,
        region: 'GLOBAL',
        search_type: 'WEB',
      }
    )

    const analysis = await getKeywordAnalysis(
      supabase,
      userId,
      keywordId,
      'GLOBAL',
      '5Y',
      'WEB'
    )

    return {
      id: created.id,
      analysis,
    }
  }

  const refreshed = await refreshKeywordAnalysis(
    supabase,
    userId,
    existingAnalysis.id
  )

  return {
    id: refreshed.id,
    analysis: refreshed,
  }
}

export async function getOwnedAnalysis(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
) {
  const { data: analysis, error: analysisError } = await supabase
    .from('keyword_analysis')
    .select('*')
    .eq('id', analysisId)
    .single()

  if (analysisError && analysisError.code !== 'PGRST116') throw analysisError
  if (!analysis) return null

  const { data: keyword, error: keywordError } = await supabase
    .from('keywords')
    .select('id')
    .eq('id', analysis.keyword_id)
    .eq('user_id', userId)
    .single()

  if (keywordError && keywordError.code !== 'PGRST116') throw keywordError
  if (!keyword) return null

  return toAnalysis(analysis as AnalysisRow)
}

export async function updateOwnedAnalysis(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string,
  input: AnalysisUpdateInput
) {
  const analysis = await getOwnedAnalysis(supabase, userId, analysisId)
  if (!analysis) {
    throw new AnalysisServiceError(
      'NOT_FOUND',
      'Analysis를 찾을 수 없습니다.',
      404
    )
  }

  await updateKeywordAnalysis(analysisId, input, supabase)
  return { success: true }
}

export async function deleteOwnedAnalysis(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
) {
  const analysis = await getOwnedAnalysis(supabase, userId, analysisId)
  if (!analysis) {
    throw new AnalysisServiceError(
      'NOT_FOUND',
      'Analysis를 찾을 수 없습니다.',
      404
    )
  }

  await deleteKeywordAnalysis(analysisId, supabase)
  return { success: true }
}

export async function reorderOwnedAnalyses(
  supabase: SupabaseClient,
  userId: string,
  orderedIds: string[]
) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new AnalysisServiceError(
      'INVALID_ORDER',
      '유효하지 않은 조건 순서입니다.',
      400
    )
  }

  const uniqueIds = Array.from(new Set(orderedIds))
  if (uniqueIds.length !== orderedIds.length) {
    throw new AnalysisServiceError(
      'DUPLICATE_ANALYSIS_ID',
      '중복된 조건 ID가 포함되어 있습니다.',
      400
    )
  }

  const { data: ownedAnalyses, error: ownedError } = await supabase
    .from('keyword_analysis')
    .select('id, keywords!inner(user_id)')
    .in('id', orderedIds)
    .eq('keywords.user_id', userId)

  if (ownedError) throw ownedError
  if ((ownedAnalyses ?? []).length !== orderedIds.length) {
    throw new AnalysisServiceError(
      'ANALYSIS_OWNERSHIP_MISMATCH',
      '조건 순서를 변경할 권한이 없습니다.',
      403
    )
  }

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('keyword_analysis')
        .update({ display_order: index + 1 })
        .eq('id', id)
        .then(({ error }) => {
          if (error) throw error
        })
    )
  )

  return { success: true }
}
