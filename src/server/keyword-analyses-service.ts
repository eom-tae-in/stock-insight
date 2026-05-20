import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildTrendsDataWithIndicators,
  fetchInternalTrendsData,
  TrendsProviderError,
} from '@/server/trends-internal-service'
import { parsePytrendsParams } from '@/lib/parsers/trends-parsers'
import type { AnalysisRepository } from './repositories/analysis-repository'
import { SupabaseAnalysisRepository } from './repositories/supabase-analysis-repository'
import type {
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
  ma13_data: number | null
  yoy_data: number | null
}>

async function getOwnedKeywordName(
  repository: AnalysisRepository,
  userId: string,
  keywordId: string
) {
  const keyword = await repository.getOwnedKeywordName(userId, keywordId)

  if (!keyword) {
    throw new AnalysisServiceError(
      'NOT_FOUND',
      '키워드를 찾을 수 없습니다.',
      404
    )
  }

  return keyword
}

export function createAnalysisService(repository: AnalysisRepository) {
  return {
    async getKeywordAnalysis(
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

      return repository.findByFilters(
        userId,
        keywordId,
        region,
        period,
        searchType
      )
    },

    async getKeywordAnalysesList(userId: string, keywordId: string) {
      if (!keywordId) {
        throw new AnalysisServiceError(
          'INVALID_REQUEST',
          'keywordId가 필요합니다.',
          400
        )
      }

      const analyses = await repository.findManyByKeywordId(userId, keywordId)
      return analyses.filter(analysis => analysis.period === '5Y')
    },

    async createKeywordAnalysisForKeyword(
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
        input.keyword ??
        (await getOwnedKeywordName(repository, userId, keywordId))
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
        const analysisId = await repository.create({
          keyword_id: keywordId,
          region,
          period,
          search_type: searchType,
          trends_data: trendsData,
          ma13_data: lastTrendPoint?.ma13Value ?? undefined,
          yoy_data: lastTrendPoint?.yoyValue ?? undefined,
        })

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
    },

    async refreshKeywordAnalysis(userId: string, analysisId: string) {
      const ownedAnalysis = await repository.findOwnedWithKeyword(
        userId,
        analysisId
      )

      if (!ownedAnalysis) {
        throw new AnalysisServiceError(
          'NOT_FOUND',
          'Analysis를 찾을 수 없습니다.',
          404
        )
      }

      try {
        const parsed = parsePytrendsParams({
          keyword: ownedAnalysis.keyword,
          geo: ownedAnalysis.analysis.region,
          timeframe: ownedAnalysis.analysis.period,
          gprop: ownedAnalysis.analysis.search_type,
        })
        const trendsRawData = await fetchInternalTrendsData({
          keyword: parsed.keyword,
          geo: parsed.geo,
          timeframe: parsed.timeframe,
          gprop: parsed.gprop,
        })
        const trendsData = buildTrendsDataWithIndicators(trendsRawData)
        const lastTrendPoint = trendsData.at(-1)

        await repository.update(analysisId, {
          trends_data: trendsData,
          ma13_data: lastTrendPoint?.ma13Value ?? null,
          yoy_data: lastTrendPoint?.yoyValue ?? null,
        })

        const refreshed = await repository.findOwnedById(userId, analysisId)
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
    },

    getOwnedAnalysis(userId: string, analysisId: string) {
      return repository.findOwnedById(userId, analysisId)
    },

    async updateOwnedAnalysis(
      userId: string,
      analysisId: string,
      input: AnalysisUpdateInput
    ) {
      const analysis = await repository.findOwnedById(userId, analysisId)
      if (!analysis) {
        throw new AnalysisServiceError(
          'NOT_FOUND',
          'Analysis를 찾을 수 없습니다.',
          404
        )
      }

      await repository.update(analysisId, input)
      return { success: true }
    },

    async deleteOwnedAnalysis(userId: string, analysisId: string) {
      const analysis = await repository.findOwnedById(userId, analysisId)
      if (!analysis) {
        throw new AnalysisServiceError(
          'NOT_FOUND',
          'Analysis를 찾을 수 없습니다.',
          404
        )
      }

      await repository.deleteById(analysisId)
      return { success: true }
    },

    async reorderOwnedAnalyses(userId: string, orderedIds: string[]) {
      if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        throw new AnalysisServiceError(
          'INVALID_ORDER',
          '유효하지 않은 조건 순서입니다.',
          400
        )
      }

      try {
        await repository.reorder(userId, orderedIds)
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'DUPLICATE_ANALYSIS_ID'
        ) {
          throw new AnalysisServiceError(
            'DUPLICATE_ANALYSIS_ID',
            '중복된 조건 ID가 포함되어 있습니다.',
            400
          )
        }

        if (
          error instanceof Error &&
          error.message === 'ANALYSIS_OWNERSHIP_MISMATCH'
        ) {
          throw new AnalysisServiceError(
            'ANALYSIS_OWNERSHIP_MISMATCH',
            '조건 순서를 변경할 권한이 없습니다.',
            403
          )
        }

        throw error
      }

      return { success: true }
    },
  }
}

function createSupabaseAnalysisService(supabase: SupabaseClient) {
  return createAnalysisService(new SupabaseAnalysisRepository(supabase))
}

export async function refreshDefaultKeywordAnalysis(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string
) {
  const service = createSupabaseAnalysisService(supabase)
  const existingAnalysis = await service.getKeywordAnalysis(
    userId,
    keywordId,
    'GLOBAL',
    '5Y',
    'WEB'
  )

  if (!existingAnalysis) {
    const created = await service.createKeywordAnalysisForKeyword(
      userId,
      keywordId,
      {
        region: 'GLOBAL',
        search_type: 'WEB',
      }
    )

    const analysis = await service.getKeywordAnalysis(
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

  const refreshed = await service.refreshKeywordAnalysis(
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
  return createSupabaseAnalysisService(supabase).getOwnedAnalysis(
    userId,
    analysisId
  )
}

export async function updateOwnedAnalysis(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string,
  input: AnalysisUpdateInput
) {
  return createSupabaseAnalysisService(supabase).updateOwnedAnalysis(
    userId,
    analysisId,
    input
  )
}

export async function deleteOwnedAnalysis(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
) {
  return createSupabaseAnalysisService(supabase).deleteOwnedAnalysis(
    userId,
    analysisId
  )
}

export async function reorderOwnedAnalyses(
  supabase: SupabaseClient,
  userId: string,
  orderedIds: string[]
) {
  return createSupabaseAnalysisService(supabase).reorderOwnedAnalyses(
    userId,
    orderedIds
  )
}

export async function getKeywordAnalysis(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string,
  region: Region = 'GLOBAL',
  period: Period = '5Y',
  searchType: SearchType = 'WEB'
) {
  return createSupabaseAnalysisService(supabase).getKeywordAnalysis(
    userId,
    keywordId,
    region,
    period,
    searchType
  )
}

export async function getKeywordAnalysesList(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string
) {
  return createSupabaseAnalysisService(supabase).getKeywordAnalysesList(
    userId,
    keywordId
  )
}

export async function createKeywordAnalysisForKeyword(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string,
  input: AnalysisCreateInput
) {
  return createSupabaseAnalysisService(
    supabase
  ).createKeywordAnalysisForKeyword(userId, keywordId, input)
}

export async function refreshKeywordAnalysis(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
) {
  return createSupabaseAnalysisService(supabase).refreshKeywordAnalysis(
    userId,
    analysisId
  )
}
