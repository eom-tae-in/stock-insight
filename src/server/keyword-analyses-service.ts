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
  period?: Period
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

function mapRegionToGeo(region: Region) {
  const geoMap: Record<Region, string> = {
    GLOBAL: '',
    US: 'US',
    KR: 'KR',
    JP: 'JP',
    CN: 'CN',
  }

  return geoMap[region]
}

function mapSearchTypeToGprop(searchType: SearchType) {
  const gpropMap: Record<SearchType, string> = {
    WEB: '',
    YOUTUBE: 'youtube',
  }

  return gpropMap[searchType]
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
  const region = input.region ?? 'GLOBAL'
  const period = input.period ?? '5Y'
  const searchType = input.search_type ?? 'WEB'

  try {
    const trendsRawData = await fetchInternalTrendsData({
      keyword,
      geo: mapRegionToGeo(region),
      timeframe: period.toLowerCase(),
      gprop: mapSearchTypeToGprop(searchType),
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
