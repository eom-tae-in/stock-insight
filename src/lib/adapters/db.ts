/**
 * Database Adapter - Supabase Implementation (재설계)
 *
 * 새로운 스키마:
 * - searches: 종목 저장소
 * - stock_price_data: 5년 일일 주가
 * - keyword_searches: 키워드 저장 기록
 * - keyword_chart_timeseries: 차트 전체 시계열 (trends, ma13, yoy)
 * - keyword_stock_overlays: 키워드-종목 매핑
 * - overlay_chart_timeseries: 정규화된 주가 시계열
 */

import type {
  SearchRecord,
  PriceDataPoint,
  KeywordSearchRecord,
  KeywordStockOverlay,
} from '@/types/database'
import { getSupabaseClient } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

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

  // ============ keyword_searches (키워드) ============
  upsertKeywordSearch(
    record: KeywordSearchRecord,
    client?: SupabaseClient
  ): Promise<string>
  getKeywordSearch(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<KeywordSearchRecord | null>
  getKeywordSearchByKeyword(
    keyword: string,
    client?: SupabaseClient
  ): Promise<KeywordSearchRecord | null>
  getAllKeywordSearches(client?: SupabaseClient): Promise<KeywordSearchRecord[]>
  deleteKeywordSearch(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<boolean>
  markKeywordAsViewed(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<boolean>

  // ============ keyword_chart_timeseries (차트 시계열 - 핵심) ============
  insertKeywordChartTimeseries(
    keywordSearchId: string,
    chartData: Array<{
      weekIndex: number
      date: string
      trendsValue: number
      ma13Value: number | null
      yoyValue: number | null
    }>,
    client?: SupabaseClient
  ): Promise<void>

  getKeywordChartTimeseries(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<
    Array<{
      weekIndex: number
      date: string
      trendsValue: number
      ma13Value: number | null
      yoyValue: number | null
    }>
  >

  // ============ keyword_stock_overlays (오버레이) ============
  addStockOverlay(
    keywordSearchId: string,
    searchId: string,
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

  // ============ keyword_searches ============

  async upsertKeywordSearch(
    record: KeywordSearchRecord,
    client?: SupabaseClient
  ): Promise<string> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('keyword_searches')
      .upsert(
        {
          user_id: record.user_id,
          keyword: record.keyword,
          searched_at: record.searched_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,keyword' }
      )
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  async getKeywordSearch(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<KeywordSearchRecord | null> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('keyword_searches')
      .select('*')
      .eq('id', keywordSearchId)
      .single()

    if (error) return null

    return {
      id: data.id,
      user_id: data.user_id,
      keyword: data.keyword,
      trends_data: [],
      searched_at: data.searched_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_viewed_at: data.last_viewed_at,
    }
  }

  async getKeywordSearchByKeyword(
    keyword: string,
    client?: SupabaseClient
  ): Promise<KeywordSearchRecord | null> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('keyword_searches')
      .select('*')
      .eq('keyword', keyword)
      .single()

    if (error) return null

    return {
      id: data.id,
      user_id: data.user_id,
      keyword: data.keyword,
      trends_data: [],
      searched_at: data.searched_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_viewed_at: data.last_viewed_at,
    }
  }

  async getAllKeywordSearches(
    client?: SupabaseClient
  ): Promise<KeywordSearchRecord[]> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('keyword_searches')
      .select('*')
      .order('searched_at', { ascending: false })

    if (error) throw error

    return (data || []).map(row => ({
      id: row.id,
      user_id: row.user_id,
      keyword: row.keyword,
      trends_data: [],
      searched_at: row.searched_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_viewed_at: row.last_viewed_at,
    }))
  }

  async deleteKeywordSearch(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<boolean> {
    const supabase = client ?? getSupabaseClient()

    const { error } = await supabase
      .from('keyword_searches')
      .delete()
      .eq('id', keywordSearchId)

    return !error
  }

  async markKeywordAsViewed(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<boolean> {
    const supabase = client ?? getSupabaseClient()

    const { error } = await supabase
      .from('keyword_searches')
      .update({ last_viewed_at: new Date().toISOString() })
      .eq('id', keywordSearchId)

    return !error
  }

  // ============ keyword_chart_timeseries ============

  async insertKeywordChartTimeseries(
    keywordSearchId: string,
    chartData: Array<{
      weekIndex: number
      date: string
      trendsValue: number
      ma13Value: number | null
      yoyValue: number | null
    }>,
    client?: SupabaseClient
  ): Promise<void> {
    if (chartData.length === 0) return

    const supabase = client ?? getSupabaseClient()

    const records = chartData.map(row => ({
      keyword_search_id: keywordSearchId,
      week_index: row.weekIndex,
      date: row.date,
      trends_value: row.trendsValue,
      ma13_value: row.ma13Value,
      yoy_value: row.yoyValue,
    }))

    const { error } = await supabase
      .from('keyword_chart_timeseries')
      .insert(records)

    if (error) throw error
  }

  async getKeywordChartTimeseries(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<
    Array<{
      weekIndex: number
      date: string
      trendsValue: number
      ma13Value: number | null
      yoyValue: number | null
    }>
  > {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('keyword_chart_timeseries')
      .select('*')
      .eq('keyword_search_id', keywordSearchId)
      .order('date', { ascending: true })

    if (error) throw error

    return (data || []).map(row => ({
      weekIndex: row.week_index,
      date: row.date,
      trendsValue: row.trends_value,
      ma13Value: row.ma13_value,
      yoyValue: row.yoy_value,
    }))
  }

  // ============ keyword_stock_overlays ============

  async addStockOverlay(
    keywordSearchId: string,
    searchId: string,
    ticker: string,
    companyName: string,
    displayOrder: number = 0,
    client?: SupabaseClient
  ): Promise<string> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('keyword_stock_overlays')
      .insert({
        keyword_search_id: keywordSearchId,
        search_id: searchId,
        ticker,
        company_name: companyName,
        display_order: displayOrder,
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  async getKeywordStockOverlays(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<KeywordStockOverlay[]> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('keyword_stock_overlays')
      .select('*')
      .eq('keyword_search_id', keywordSearchId)
      .order('display_order', { ascending: true })

    if (error) throw error

    return (data || []).map(row => ({
      id: row.id,
      keyword_search_id: row.keyword_search_id,
      search_id: row.search_id,
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
      .insert(records)

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
}

// Export singleton instance
export const db: DbAdapter = new SupabaseDbAdapter()
