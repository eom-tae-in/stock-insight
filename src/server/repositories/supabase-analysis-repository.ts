import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  KeywordAnalysis,
  Period,
  Region,
  SearchType,
  TrendsDataPoint,
} from '@/types/database'
import type {
  AnalysisCreateData,
  AnalysisRepository,
  AnalysisUpdateData,
  OwnedAnalysisWithKeyword,
} from './analysis-repository'

type AnalysisRow = {
  id: string
  keyword_id: string
  region: Region
  period: Period
  search_type: SearchType
  trends_data: TrendsDataPoint[] | null
  ma13_data?: number | null
  yoy_data?: number | null
  display_order?: number | null
  created_at: string
  updated_at?: string | null
}

type AnalysisWithKeywordRow = AnalysisRow & {
  keywords?:
    | { name: string; user_id: string }
    | Array<{ name: string; user_id: string }>
}

export class SupabaseAnalysisRepository implements AnalysisRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByFilters(
    userId: string,
    keywordId: string,
    region: Region,
    period: Period,
    searchType: SearchType
  ): Promise<KeywordAnalysis | null> {
    const { data: keywordOwner, error: keywordError } = await this.client
      .from('keywords')
      .select('id')
      .eq('id', keywordId)
      .eq('user_id', userId)
      .single()

    if (keywordError && keywordError.code !== 'PGRST116') throw keywordError
    if (!keywordOwner) return null

    const { data, error } = await this.client
      .from('keyword_analysis')
      .select('*')
      .eq('keyword_id', keywordId)
      .eq('region', region)
      .eq('period', period)
      .eq('search_type', searchType)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data ? toAnalysis(data as AnalysisRow) : null
  }

  async findManyByKeywordId(
    userId: string,
    keywordId: string
  ): Promise<KeywordAnalysis[]> {
    const { data: keywordOwner, error: keywordError } = await this.client
      .from('keywords')
      .select('id')
      .eq('id', keywordId)
      .eq('user_id', userId)
      .single()

    if (keywordError && keywordError.code !== 'PGRST116') throw keywordError
    if (!keywordOwner) return []

    const { data, error } = await this.client
      .from('keyword_analysis')
      .select(
        'id, keyword_id, region, period, search_type, trends_data, ma13_data, yoy_data, display_order, created_at, updated_at'
      )
      .eq('keyword_id', keywordId)
      .order('display_order', { ascending: true })
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return ((data ?? []) as AnalysisRow[]).map(toAnalysis)
  }

  async findOwnedById(
    userId: string,
    analysisId: string
  ): Promise<KeywordAnalysis | null> {
    const result = await this.findOwnedWithKeyword(userId, analysisId)
    return result?.analysis ?? null
  }

  async findOwnedWithKeyword(
    userId: string,
    analysisId: string
  ): Promise<OwnedAnalysisWithKeyword | null> {
    const { data, error } = await this.client
      .from('keyword_analysis')
      .select('*, keywords!inner(name, user_id)')
      .eq('id', analysisId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) return null

    const row = data as AnalysisWithKeywordRow
    const keyword = Array.isArray(row.keywords) ? row.keywords[0] : row.keywords
    if (!keyword || keyword.user_id !== userId) return null

    return {
      analysis: toAnalysis(row),
      keyword: keyword.name,
    }
  }

  async getOwnedKeywordName(
    userId: string,
    keywordId: string
  ): Promise<string | null> {
    const { data, error } = await this.client
      .from('keywords')
      .select('name')
      .eq('id', keywordId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data ? (data.name as string) : null
  }

  async create(data: AnalysisCreateData): Promise<string> {
    const trendsData = data.trends_data || []
    const { data: existing, error: existingError } = await this.client
      .from('keyword_analysis')
      .select('id')
      .eq('keyword_id', data.keyword_id)
      .eq('region', data.region)
      .eq('period', data.period)
      .eq('search_type', data.search_type)
      .single()

    if (existingError && existingError.code !== 'PGRST116') throw existingError
    if (existing) {
      if (trendsData.length === 0) return existing.id

      const { error } = await this.client
        .from('keyword_analysis')
        .update({
          trends_data: trendsData,
          ma13_data: data.ma13_data,
          yoy_data: data.yoy_data,
        })
        .eq('id', existing.id)

      if (error) throw error
      return existing.id
    }

    const { data: keywordOwner, error: keywordOwnerError } = await this.client
      .from('keywords')
      .select('user_id')
      .eq('id', data.keyword_id)
      .single()

    if (keywordOwnerError) throw keywordOwnerError

    const { data: orderRows, error: orderError } = await this.client
      .from('keyword_analysis')
      .select('display_order, keywords!inner(user_id)')
      .eq('keywords.user_id', keywordOwner.user_id)
      .order('display_order', { ascending: false })
      .limit(1)

    if (orderError) throw orderError

    const nextDisplayOrder =
      orderRows && orderRows.length > 0
        ? Number(orderRows[0].display_order ?? 0) + 1
        : 1

    const { data: result, error } = await this.client
      .from('keyword_analysis')
      .insert({
        keyword_id: data.keyword_id,
        region: data.region,
        period: data.period,
        search_type: data.search_type,
        trends_data: trendsData,
        ma13_data: data.ma13_data,
        yoy_data: data.yoy_data,
        display_order: nextDisplayOrder,
      })
      .select('id')
      .single()

    if (error) throw error
    return result.id
  }

  async update(analysisId: string, data: AnalysisUpdateData): Promise<boolean> {
    const updateData: {
      trends_data?: TrendsDataPoint[]
      ma13_data?: number | null
      yoy_data?: number | null
    } = {}

    if (data.trends_data !== undefined)
      updateData.trends_data = data.trends_data
    if (data.ma13_data !== undefined) updateData.ma13_data = data.ma13_data
    if (data.yoy_data !== undefined) updateData.yoy_data = data.yoy_data

    const { error } = await this.client
      .from('keyword_analysis')
      .update(updateData)
      .eq('id', analysisId)

    if (error) throw error
    return true
  }

  async deleteById(analysisId: string): Promise<boolean> {
    const { error } = await this.client
      .from('keyword_analysis')
      .delete()
      .eq('id', analysisId)

    if (error) throw error
    return true
  }

  async reorder(userId: string, orderedIds: string[]): Promise<void> {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new Error('INVALID_ORDER')
    }

    const uniqueIds = Array.from(new Set(orderedIds))
    if (uniqueIds.length !== orderedIds.length) {
      throw new Error('DUPLICATE_ANALYSIS_ID')
    }

    const { data: ownedAnalyses, error: ownedError } = await this.client
      .from('keyword_analysis')
      .select('id, keywords!inner(user_id)')
      .in('id', orderedIds)
      .eq('keywords.user_id', userId)

    if (ownedError) throw ownedError
    if ((ownedAnalyses ?? []).length !== orderedIds.length) {
      throw new Error('ANALYSIS_OWNERSHIP_MISMATCH')
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        this.client
          .from('keyword_analysis')
          .update({ display_order: index + 1 })
          .eq('id', id)
          .then(({ error }) => {
            if (error) throw error
          })
      )
    )
  }
}

function toAnalysis(row: AnalysisRow): KeywordAnalysis {
  return {
    id: row.id,
    keyword_id: row.keyword_id,
    region: row.region,
    period: row.period,
    search_type: row.search_type,
    trends_data: row.trends_data ?? [],
    ma13_data: row.ma13_data ?? undefined,
    yoy_data: row.yoy_data ?? undefined,
    display_order: row.display_order ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at ?? undefined,
  }
}
