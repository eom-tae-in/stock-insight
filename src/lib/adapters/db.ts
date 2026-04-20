/**
 * Database Adapter - Supabase Implementation (재설계)
 *
 * 새로운 스키마:
 * - searches: 종목 저장소
 * - stock_price_data: 5년 일일 주가
 * - keywords: 키워드 저장소
 * - keyword_analysis: 조건별 키워드 분석
 * - keyword_stock_overlays: 키워드-종목 매핑
 * - overlay_chart_timeseries: 정규화된 주가 시계열
 */

import type {
  SearchRecord,
  PriceDataPoint,
  KeywordStockOverlay,
  KeywordAnalysis,
  KeywordAnalysisRaw,
  Region,
  Period,
  SearchType,
  TrendsDataPoint,
} from '@/types/database'
import { getSupabaseClient } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeKeywordSpacing } from '@/lib/utils/keyword-normalization'

export interface DbAdapter {
  // ============ searches (종목) ============
  upsertSearch(record: SearchRecord, client?: SupabaseClient): Promise<string>
  getSearch(
    searchId: string,
    userId: string,
    client?: SupabaseClient
  ): Promise<SearchRecord | null>
  getSearchByTicker(
    ticker: string,
    userId: string,
    client?: SupabaseClient
  ): Promise<SearchRecord | null>
  getAllSearches(
    userId: string,
    client?: SupabaseClient
  ): Promise<SearchRecord[]>
  deleteSearch(searchId: string, client?: SupabaseClient): Promise<boolean>

  // ============ stock_price_data (주가 시계열) ============
  insertPriceData(
    searchId: string,
    priceData: PriceDataPoint[],
    client?: SupabaseClient
  ): Promise<void>
  getPriceDataBySearchId(
    searchId: string,
    client?: SupabaseClient
  ): Promise<PriceDataPoint[]>

  // ============ keywords & keyword_analysis (조건 조합 기반) ============
  getKeywordAnalysisByFilters(
    keywordId: string,
    region: Region,
    period: Period,
    searchType: SearchType,
    userId?: string,
    client?: SupabaseClient
  ): Promise<KeywordAnalysis | null>

  getAllKeywordAnalyses(
    userId: string,
    client?: SupabaseClient
  ): Promise<KeywordAnalysis[]>

  createKeywordAnalysis(
    data: Omit<KeywordAnalysis, 'id' | 'created_at' | 'updated_at'>,
    client?: SupabaseClient
  ): Promise<string>

  updateKeywordAnalysis(
    id: string,
    data: Partial<Omit<KeywordAnalysis, 'id' | 'keyword_id' | 'region' | 'period' | 'search_type' | 'created_at'>>,
    client?: SupabaseClient
  ): Promise<boolean>

  deleteKeywordAnalysis(
    id: string,
    client?: SupabaseClient
  ): Promise<boolean>

  // ============ keyword_stock_overlays (오버레이) ============
  addStockOverlay(
    keywordSearchId: string,
    ticker: string,
    companyName: string,
    displayOrder?: number,
    client?: SupabaseClient
  ): Promise<string>

  getKeywordStockOverlays(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<KeywordStockOverlay[]>

  removeStockOverlay(
    overlayId: string,
    client?: SupabaseClient
  ): Promise<boolean>

  removeStockOverlaysBatch(
    overlayIds: string[],
    client?: SupabaseClient
  ): Promise<boolean>

  updateStockOverlayOrder(
    overlayId: string,
    newDisplayOrder: number,
    client?: SupabaseClient
  ): Promise<boolean>

  // ============ overlay_chart_timeseries (오버레이 시계열 - 핵심) ============
  insertOverlayChartTimeseries(
    overlayId: string,
    overlayData: Array<{
      date: string
      normalizedPrice: number
      rawPrice: number
    }>,
    client?: SupabaseClient
  ): Promise<void>

  getOverlayChartTimeseries(
    overlayId: string,
    client?: SupabaseClient
  ): Promise<
    Array<{
      date: string
      normalizedPrice: number
      rawPrice: number
    }>
  >
}

// ============================================================================
// Supabase 구현
// ============================================================================

class SupabaseDbAdapter implements DbAdapter {
  private async getOrCreateKeyword(
    userId: string,
    keywordName: string,
    preferredId: string,
    client?: SupabaseClient
  ): Promise<string> {
    const supabase = client ?? getSupabaseClient()

    const { data: existingKeyword, error: existingError } = await supabase
      .from('keywords')
      .select('id')
      .eq('user_id', userId)
      .eq('normalized_name', keywordName)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError
    }

    if (existingKeyword) return existingKeyword.id

    const { data: createdKeyword, error: createError } = await supabase
      .from('keywords')
      .insert({
        id: preferredId,
        user_id: userId,
        name: keywordName,
        normalized_name: keywordName,
      })
      .select('id')
      .single()

    if (createError?.code === '23505') {
      const { data: racedKeyword, error: racedError } = await supabase
        .from('keywords')
        .select('id')
        .eq('user_id', userId)
        .eq('normalized_name', keywordName)
        .single()

      if (racedError) throw racedError
      return racedKeyword.id
    }

    if (createError) throw createError
    return createdKeyword.id
  }

  private async resolveKeywordId(
    keywordIdOrKeywordSearchId: string,
    client?: SupabaseClient
  ): Promise<string> {
    const supabase = client ?? getSupabaseClient()

    const { data: keyword, error: keywordError } = await supabase
      .from('keywords')
      .select('id')
      .eq('id', keywordIdOrKeywordSearchId)
      .single()

    if (keywordError && keywordError.code !== 'PGRST116') {
      throw keywordError
    }

    if (keyword) return keyword.id

    const { data: keywordSearch, error: keywordSearchError } = await supabase
      .from('keyword_searches')
      .select('user_id, keyword, normalized_keyword')
      .eq('id', keywordIdOrKeywordSearchId)
      .single()

    if (keywordSearchError) throw keywordSearchError

    const keywordName = normalizeKeywordSpacing(
      keywordSearch.normalized_keyword ?? keywordSearch.keyword
    )

    return this.getOrCreateKeyword(
      keywordSearch.user_id,
      keywordName,
      keywordIdOrKeywordSearchId,
      supabase
    )
  }

  private async getDefaultKeywordAnalysisId(
    keywordId: string,
    client?: SupabaseClient
  ): Promise<string> {
    const supabase = client ?? getSupabaseClient()
    const resolvedKeywordId = await this.resolveKeywordId(keywordId, supabase)

    const { data: existingAnalysis, error: existingError } = await supabase
      .from('keyword_analysis')
      .select('id')
      .eq('keyword_id', resolvedKeywordId)
      .eq('region', 'GLOBAL')
      .eq('period', '5Y')
      .eq('search_type', 'WEB')
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError
    }

    if (existingAnalysis) return existingAnalysis.id

    const { data: createdAnalysis, error: createError } = await supabase
      .from('keyword_analysis')
      .insert({
        keyword_id: resolvedKeywordId,
        region: 'GLOBAL',
        period: '5Y',
        search_type: 'WEB',
        trends_data: [],
      })
      .select('id')
      .single()

    if (createError?.code === '23505') {
      const { data: racedAnalysis, error: racedError } = await supabase
        .from('keyword_analysis')
        .select('id')
        .eq('keyword_id', resolvedKeywordId)
        .eq('region', 'GLOBAL')
        .eq('period', '5Y')
        .eq('search_type', 'WEB')
        .single()

      if (racedError) throw racedError
      return racedAnalysis.id
    }

    if (createError) throw createError
    return createdAnalysis.id
  }

  // ============ searches ============

  async upsertSearch(
    record: SearchRecord,
    client?: SupabaseClient
  ): Promise<string> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('searches')
      .upsert(
        {
          user_id: record.user_id,
          ticker: record.ticker.toUpperCase(),
          company_name: record.company_name,
          currency: record.currency || 'USD',
          searched_at: record.searched_at,
        },
        { onConflict: 'user_id,ticker' }
      )
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  async getSearch(
    searchId: string,
    userId: string,
    client?: SupabaseClient
  ): Promise<SearchRecord | null> {
    const supabase = client ?? getSupabaseClient()

    // RLS 검증: 해당 종목이 사용자 소유인지 확인
    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .eq('id', searchId)
      .eq('user_id', userId) // ← RLS 필터링
      .single()

    if (error) return null

    // 가격 데이터 조회
    const priceData = await this.getPriceDataBySearchId(searchId, client)

    return {
      id: data.id,
      user_id: data.user_id,
      ticker: data.ticker,
      company_name: data.company_name,
      currency: data.currency,
      current_price:
        priceData.length > 0 ? priceData[priceData.length - 1].close : 0,
      price_data: priceData,
      trends_data: [],
      searched_at: data.searched_at,
      created_at: data.created_at,
    }
  }

  async getSearchByTicker(
    ticker: string,
    userId: string,
    client?: SupabaseClient
  ): Promise<SearchRecord | null> {
    const supabase = client ?? getSupabaseClient()

    // RLS 검증: 해당 종목이 사용자 소유인지 확인
    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .eq('user_id', userId) // ← RLS 필터링
      .single()

    if (error) return null

    // 가격 데이터 조회
    const priceData = await this.getPriceDataBySearchId(data.id, client)

    return {
      id: data.id,
      user_id: data.user_id,
      ticker: data.ticker,
      company_name: data.company_name,
      currency: data.currency,
      current_price:
        priceData.length > 0 ? priceData[priceData.length - 1].close : 0,
      price_data: priceData,
      trends_data: [],
      searched_at: data.searched_at,
      created_at: data.created_at,
    }
  }

  async getAllSearches(
    userId: string,
    client?: SupabaseClient
  ): Promise<SearchRecord[]> {
    const supabase = client ?? getSupabaseClient()

    // RLS 검증: 사용자 자신의 종목만 조회
    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .eq('user_id', userId) // ← RLS 필터링 (필수)
      .order('searched_at', { ascending: false })

    if (error) throw error

    // 각 종목의 price_data 병렬 로드 (N+1 쿼리 방지)
    const searchesWithPrices = await Promise.all(
      (data || []).map(async row => {
        const priceData = await this.getPriceDataBySearchId(row.id, client)
        return {
          id: row.id,
          user_id: row.user_id,
          ticker: row.ticker,
          company_name: row.company_name,
          currency: row.currency,
          current_price:
            priceData.length > 0
              ? priceData[priceData.length - 1].close
              : undefined,
          yoy_change: undefined, // 대시보드에서는 간단히 표시, 상세 계산은 분석 페이지에서
          price_data: priceData,
          trends_data: [],
          searched_at: row.searched_at,
          created_at: row.created_at,
        }
      })
    )

    return searchesWithPrices
  }

  async deleteSearch(
    searchId: string,
    client?: SupabaseClient
  ): Promise<boolean> {
    const supabase = client ?? getSupabaseClient()

    const { error } = await supabase
      .from('searches')
      .delete()
      .eq('id', searchId)

    return !error
  }

  // ============ stock_price_data ============

  async insertPriceData(
    searchId: string,
    priceData: PriceDataPoint[],
    client?: SupabaseClient
  ): Promise<void> {
    if (priceData.length === 0) return

    const supabase = client ?? getSupabaseClient()

    const records = priceData.map(p => ({
      search_id: searchId,
      date: p.date,
      close: p.close,
      open: p.open,
      high: p.high,
      low: p.low,
      volume: p.volume,
    }))

    const { error } = await supabase
      .from('stock_price_data')
      .upsert(records, { onConflict: 'search_id,date' })

    if (error) throw error
  }

  async getPriceDataBySearchId(
    searchId: string,
    client?: SupabaseClient
  ): Promise<PriceDataPoint[]> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('stock_price_data')
      .select('*')
      .eq('search_id', searchId)
      .order('date', { ascending: true })

    if (error) throw error

    return (data || []).map(row => ({
      date: row.date,
      close: row.close,
      open: row.open,
      high: row.high,
      low: row.low,
      volume: row.volume,
    }))
  }

  // ============ keyword_stock_overlays ============

  async addStockOverlay(
    keywordSearchId: string,
    ticker: string,
    companyName: string,
    displayOrder: number = 0,
    client?: SupabaseClient
  ): Promise<string> {
    const supabase = client ?? getSupabaseClient()
    const analysisId = await this.getDefaultKeywordAnalysisId(
      keywordSearchId,
      supabase
    )
    const normalizedTicker = ticker.trim().toUpperCase()

    const { data, error } = await supabase
      .from('keyword_stock_overlays')
      .insert({
        analysis_id: analysisId,
        ticker: normalizedTicker,
        company_name: companyName.trim() || normalizedTicker,
        display_order: displayOrder,
      })
      .select('id')
      .single()

    if (error?.code === '23505') {
      const { data: existingOverlay, error: existingError } = await supabase
        .from('keyword_stock_overlays')
        .select('id')
        .eq('analysis_id', analysisId)
        .eq('ticker', normalizedTicker)
        .single()

      if (existingError) throw existingError
      return existingOverlay.id
    }

    if (error) throw error
    return data.id
  }

  async getKeywordStockOverlays(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<KeywordStockOverlay[]> {
    const supabase = client ?? getSupabaseClient()
    const analysisId = await this.getDefaultKeywordAnalysisId(
      keywordSearchId,
      supabase
    )

    const { data, error } = await supabase
      .from('keyword_stock_overlays')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('display_order', { ascending: true })

    if (error) throw error

    return (data || []).map(row => ({
      id: row.id,
      ticker: row.ticker,
      company_name: row.company_name,
      display_order: row.display_order,
      created_at: row.created_at,
    }))
  }

  async removeStockOverlay(
    overlayId: string,
    client?: SupabaseClient
  ): Promise<boolean> {
    const supabase = client ?? getSupabaseClient()

    const { error } = await supabase
      .from('keyword_stock_overlays')
      .delete()
      .eq('id', overlayId)

    return !error
  }

  async removeStockOverlaysBatch(
    overlayIds: string[],
    client?: SupabaseClient
  ): Promise<boolean> {
    if (overlayIds.length === 0) return true

    const supabase = client ?? getSupabaseClient()

    const { error } = await supabase
      .from('keyword_stock_overlays')
      .delete()
      .in('id', overlayIds)

    return !error
  }

  async updateStockOverlayOrder(
    overlayId: string,
    newDisplayOrder: number,
    client?: SupabaseClient
  ): Promise<boolean> {
    const supabase = client ?? getSupabaseClient()

    const { error } = await supabase
      .from('keyword_stock_overlays')
      .update({ display_order: newDisplayOrder })
      .eq('id', overlayId)

    return !error
  }

  // ============ overlay_chart_timeseries ============

  async insertOverlayChartTimeseries(
    overlayId: string,
    overlayData: Array<{
      date: string
      normalizedPrice: number
      rawPrice: number
    }>,
    client?: SupabaseClient
  ): Promise<void> {
    if (overlayData.length === 0) return

    const supabase = client ?? getSupabaseClient()

    const records = overlayData.map(row => ({
      overlay_id: overlayId,
      date: row.date,
      normalized_price: row.normalizedPrice,
      raw_price: row.rawPrice,
    }))

    const { error } = await supabase
      .from('overlay_chart_timeseries')
      .upsert(records, { onConflict: 'overlay_id,date' })

    if (error) throw error
  }

  async getOverlayChartTimeseries(
    overlayId: string,
    client?: SupabaseClient
  ): Promise<
    Array<{
      date: string
      normalizedPrice: number
      rawPrice: number
    }>
  > {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('overlay_chart_timeseries')
      .select('*')
      .eq('overlay_id', overlayId)
      .order('date', { ascending: true })

    if (error) throw error

    return (data || []).map(row => ({
      date: row.date,
      normalizedPrice: row.normalized_price,
      rawPrice: row.raw_price,
    }))
  }

  // ============ keyword_analysis (조건 조합 기반) ============

  async getKeywordAnalysisByFilters(
    keywordId: string,
    region: Region,
    period: Period,
    searchType: SearchType,
    userId?: string,
    client?: SupabaseClient
  ): Promise<KeywordAnalysis | null> {
    const supabase = client ?? getSupabaseClient()

    if (userId) {
      const { data: keywordOwner, error: keywordError } = await supabase
        .from('keywords')
        .select('id')
        .eq('id', keywordId)
        .eq('user_id', userId)
        .single()

      if (keywordError && keywordError.code !== 'PGRST116') throw keywordError
      if (!keywordOwner) return null
    }

    const { data, error } = await supabase
      .from('keyword_analysis')
      .select('*')
      .eq('keyword_id', keywordId)
      .eq('region', region)
      .eq('period', period)
      .eq('search_type', searchType)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) return null

    return {
      id: data.id,
      keyword_id: data.keyword_id,
      region: data.region as Region,
      period: data.period as Period,
      search_type: data.search_type as SearchType,
      trends_data: data.trends_data as TrendsDataPoint[],
      ma13_data: data.ma13_data,
      yoy_data: data.yoy_data,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  }

  async getAllKeywordAnalyses(
    userId: string,
    client?: SupabaseClient
  ): Promise<KeywordAnalysis[]> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('keyword_analysis')
      .select('*, keywords!inner(user_id)')
      .eq('keywords.user_id', userId)

    if (error) throw error

    return (data || []).map((row) => ({
      id: row.id,
      keyword_id: row.keyword_id,
      region: row.region as Region,
      period: row.period as Period,
      search_type: row.search_type as SearchType,
      trends_data: row.trends_data as TrendsDataPoint[],
      ma13_data: row.ma13_data,
      yoy_data: row.yoy_data,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
  }

  async createKeywordAnalysis(
    data: Omit<KeywordAnalysis, 'id' | 'created_at' | 'updated_at'>,
    client?: SupabaseClient
  ): Promise<string> {
    const supabase = client ?? getSupabaseClient()
    const trendsData = data.trends_data || []

    const { data: existing, error: existingError } = await supabase
      .from('keyword_analysis')
      .select('id')
      .eq('keyword_id', data.keyword_id)
      .eq('region', data.region)
      .eq('period', data.period)
      .eq('search_type', data.search_type)
      .single()

    if (existingError && existingError.code !== 'PGRST116') throw existingError

    if (existing) {
      if (trendsData.length === 0) {
        return existing.id
      }

      const { error } = await supabase
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

    const { data: result, error } = await supabase
      .from('keyword_analysis')
      .insert({
        keyword_id: data.keyword_id,
        region: data.region,
        period: data.period,
        search_type: data.search_type,
        trends_data: trendsData,
        ma13_data: data.ma13_data,
        yoy_data: data.yoy_data,
      })
      .select('id')
      .single()

    if (error) throw error
    return result.id
  }

  async updateKeywordAnalysis(
    id: string,
    data: Partial<Omit<KeywordAnalysis, 'id' | 'keyword_id' | 'region' | 'period' | 'search_type' | 'created_at'>>,
    client?: SupabaseClient
  ): Promise<boolean> {
    const supabase = client ?? getSupabaseClient()

    const updateData: Partial<KeywordAnalysisRaw> = {}
    if (data.trends_data !== undefined) updateData.trends_data = JSON.stringify(data.trends_data)
    if (data.ma13_data !== undefined) updateData.ma13_data = data.ma13_data
    if (data.yoy_data !== undefined) updateData.yoy_data = data.yoy_data

    const { error } = await supabase
      .from('keyword_analysis')
      .update(updateData)
      .eq('id', id)

    if (error) throw error
    return true
  }

  async deleteKeywordAnalysis(
    id: string,
    client?: SupabaseClient
  ): Promise<boolean> {
    const supabase = client ?? getSupabaseClient()

    const { error } = await supabase
      .from('keyword_analysis')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }
}

// Export singleton instance
export const db: DbAdapter = new SupabaseDbAdapter()
