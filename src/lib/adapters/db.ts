/**
 * Database Adapter - Supabase Implementation
 *
 * Phase 6: SQLite 제거 후 Supabase 단일 DB 기반으로 통합
 * 모든 데이터베이스 작업을 Supabase(PostgreSQL)를 통해 수행합니다.
 *
 * IMPORTANT: Transaction handling은 각 adapter 메서드 내부에서 처리됩니다.
 * Callers는 transaction 세부사항을 알 필요가 없습니다.
 */

import {
  SearchRecord,
  PriceDataPoint,
  TrendsDataPoint,
  KeywordSearchRecord,
  KeywordStockOverlay,
} from '@/types/database'

// Import Supabase client
import { getSupabaseClient } from '@/lib/supabase'
import { SupabaseClient } from '@supabase/supabase-js'

// Import type guards (moved to top level to avoid repeated dynamic imports)
import { parseSearchRecordRaw } from '../type-guards'

/**
 * Database Adapter Interface
 * Defines all database operations required by the application.
 * Implementations exist for SQLite and Supabase.
 *
 * All methods are async to support both SQLite (via wrappers) and Supabase.
 * This allows for gradual migration without changing the core logic.
 *
 * NOTE: Transaction handling is internal to each adapter implementation.
 * Each method is responsible for its own transactional semantics.
 */
export interface DbAdapter {
  /**
   * Upsert a search record (insert or update)
   * Preserves id if ticker already exists
   * Internally handles transaction if needed
   * @param client - Optional Supabase client (if not provided, uses default)
   */
  upsertSearch(record: SearchRecord, client?: SupabaseClient): Promise<string>

  /**
   * Get a search record by id
   */
  getSearch(
    searchId: string,
    client?: SupabaseClient
  ): Promise<SearchRecord | null>

  /**
   * Get a search record by ticker symbol
   */
  getSearchByTicker(
    ticker: string,
    client?: SupabaseClient
  ): Promise<SearchRecord | null>

  /**
   * Get all search records (most recent first)
   */
  getAllSearches(client?: SupabaseClient): Promise<SearchRecord[]>

  /**
   * Delete a search record (cascades to related data)
   * Returns true if deleted, false if not found
   * Internally handles transaction if needed
   */
  deleteSearch(searchId: string, client?: SupabaseClient): Promise<boolean>

  /**
   * Save price data for a search
   * Replaces existing data for this search
   * Internally handles transaction if needed
   */
  insertPriceData(
    searchId: string,
    priceData: PriceDataPoint[],
    client?: SupabaseClient
  ): Promise<void>

  /**
   * Get price data for a search
   */
  getPriceDataBySearchId(
    searchId: string,
    client?: SupabaseClient
  ): Promise<PriceDataPoint[]>

  /**
   * Save trends data for a search
   * Replaces existing data for this search
   * Internally handles transaction if needed
   */
  insertTrendsData(
    searchId: string,
    trendsData: TrendsDataPoint[],
    client?: SupabaseClient
  ): Promise<void>

  /**
   * Get trends data for a search
   */
  getTrendsDataBySearchId(
    searchId: string,
    client?: SupabaseClient
  ): Promise<TrendsDataPoint[]>

  /**
   * Upsert a keyword search record
   * Preserves id if keyword already exists for user
   * Internally handles transaction if needed
   */
  upsertKeywordSearch(
    record: KeywordSearchRecord,
    client?: SupabaseClient
  ): Promise<string>

  /**
   * Get a keyword search record by id
   */
  getKeywordSearch(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<KeywordSearchRecord | null>

  /**
   * Get a keyword search record by keyword
   */
  getKeywordSearchByKeyword(
    keyword: string,
    client?: SupabaseClient
  ): Promise<KeywordSearchRecord | null>

  /**
   * Get all keyword search records (most recent first)
   */
  getAllKeywordSearches(client?: SupabaseClient): Promise<KeywordSearchRecord[]>

  /**
   * Delete a keyword search record (cascades to related data)
   * Returns true if deleted, false if not found
   */
  deleteKeywordSearch(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<boolean>

  /**
   * Save trends data for a keyword search
   */
  insertKeywordTrendsData(
    keywordSearchId: string,
    trendsData: TrendsDataPoint[],
    client?: SupabaseClient
  ): Promise<void>

  /**
   * Get trends data for a keyword search
   */
  getKeywordTrendsDataByKeywordSearchId(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<TrendsDataPoint[]>

  /**
   * Add a stock overlay to a keyword search
   * Returns the created overlay id
   */
  addStockOverlay(
    keywordSearchId: string,
    searchId: string,
    displayOrder?: number,
    client?: SupabaseClient
  ): Promise<string>

  /**
   * Remove a stock overlay from a keyword search
   * Returns true if deleted, false if not found
   */
  removeStockOverlay(
    overlayId: string,
    client?: SupabaseClient
  ): Promise<boolean>

  /**
   * Get all stock overlays for a keyword search
   */
  getKeywordStockOverlays(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<KeywordStockOverlay[]>
}

/**
 * Helper function for Supabase upsert operation
 * user_id 기반 upsert (같은 ticker도 다른 user_id면 새로 생성)
 */
async function performSupabaseUpsert(
  record: SearchRecord,
  client?: SupabaseClient
): Promise<string> {
  const supabase = client ?? getSupabaseClient()

  // user_id 기반 ticker 조회 (RLS 적용됨)
  const { data: existing, error: selectError } = await supabase
    .from('searches')
    .select('id')
    .eq('ticker', record.ticker)
    .eq('user_id', record.user_id || '') // user_id가 있는 경우만 매칭
    .maybeSingle()

  if (selectError && selectError.code !== 'PGRST116') throw selectError

  if (existing) {
    // UPDATE: 기존 레코드 업데이트
    const { error: updateError } = await supabase
      .from('searches')
      .update({
        company_name: record.company_name,
        current_price: record.current_price,
        previous_close: record.previous_close,
        ma13: record.ma13,
        yoy_change: record.yoy_change,
        week52_high: record.week52_high,
        week52_low: record.week52_low,
        price_data: record.price_data,
        trends_data: record.trends_data,
        last_updated_at: record.last_updated_at,
        searched_at: record.searched_at,
      })
      .eq('id', existing.id)

    if (updateError) throw updateError
    return existing.id
  } else {
    // INSERT: 새 레코드 생성
    const { data: insertedData, error: insertError } = await supabase
      .from('searches')
      .insert({
        id: record.id,
        ticker: record.ticker,
        company_name: record.company_name,
        current_price: record.current_price,
        previous_close: record.previous_close,
        ma13: record.ma13,
        yoy_change: record.yoy_change,
        week52_high: record.week52_high,
        week52_low: record.week52_low,
        price_data: record.price_data,
        trends_data: record.trends_data,
        last_updated_at: record.last_updated_at,
        searched_at: record.searched_at,
        created_at: record.created_at,
        user_id: record.user_id, // user_id 추가
      })
      .select('id')
      .single()

    if (insertError) throw insertError
    return insertedData.id
  }
}

/**
 * Supabase Adapter Implementation
 * Phase 6: Supabase 단일 기반 구현
 * Provides database operations using Supabase (PostgreSQL) as the provider.
 * Implements the DbAdapter interface with Supabase client methods.
 *
 * All operations are async and use Supabase's Postgres API.
 * Includes proper error handling and data transformation.
 */
export const supabaseAdapter: DbAdapter = {
  async upsertSearch(
    record: SearchRecord,
    client?: SupabaseClient
  ): Promise<string> {
    return await performSupabaseUpsert(record, client)
  },

  async getSearch(
    searchId: string,
    client?: SupabaseClient
  ): Promise<SearchRecord | null> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .eq('id', searchId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) return null

    return parseSearchRecordRaw(data)
  },

  async getSearchByTicker(
    ticker: string,
    client?: SupabaseClient
  ): Promise<SearchRecord | null> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .eq('ticker', ticker)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) return null

    return parseSearchRecordRaw(data)
  },

  async getAllSearches(client?: SupabaseClient): Promise<SearchRecord[]> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .order('searched_at', { ascending: false })

    if (error) throw error

    return (data || []).map(parseSearchRecordRaw)
  },

  async deleteSearch(
    searchId: string,
    client?: SupabaseClient
  ): Promise<boolean> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('searches')
      .delete()
      .eq('id', searchId)
      .select('id')

    if (error) throw error

    return (data && data.length > 0) || false
  },

  async insertPriceData(
    searchId: string,
    priceData: PriceDataPoint[],
    client?: SupabaseClient
  ): Promise<void> {
    const supabase = client ?? getSupabaseClient()

    // 빈 배열이면 기존 데이터 삭제만 수행
    if (priceData.length === 0) {
      const { error: deleteError } = await supabase
        .from('price_data')
        .delete()
        .eq('search_id', searchId)

      if (deleteError) throw deleteError
      return
    }

    // 배치 UPSERT (100개씩)
    // 주의: 부분 실패 시 이전 배치는 저장되고 이후 배치는 누락됨 (원자성 미보장)
    for (let i = 0; i < priceData.length; i += 100) {
      const batch = priceData.slice(i, i + 100)
      const { error } = await supabase.from('price_data').upsert(
        batch.map(p => ({
          search_id: searchId,
          date: p.date,
          close: p.close,
          open: p.open,
          high: p.high,
          low: p.low,
          volume: p.volume,
        })),
        { onConflict: 'search_id,date' }
      )

      if (error) throw error
    }
  },

  async getPriceDataBySearchId(
    searchId: string,
    client?: SupabaseClient
  ): Promise<PriceDataPoint[]> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('price_data')
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
  },

  async insertTrendsData(
    searchId: string,
    trendsData: TrendsDataPoint[],
    client?: SupabaseClient
  ): Promise<void> {
    const supabase = client ?? getSupabaseClient()

    // 빈 배열이면 기존 데이터 삭제만 수행
    if (trendsData.length === 0) {
      const { error: deleteError } = await supabase
        .from('trends_data')
        .delete()
        .eq('search_id', searchId)

      if (deleteError) throw deleteError
      return
    }

    // 배치 UPSERT (100개씩)
    // 주의: 부분 실패 시 이전 배치는 저장되고 이후 배치는 누락됨 (원자성 미보장)
    for (let i = 0; i < trendsData.length; i += 100) {
      const batch = trendsData.slice(i, i + 100)
      const { error } = await supabase.from('trends_data').upsert(
        batch.map(t => ({
          search_id: searchId,
          date: t.date,
          value: t.value,
        })),
        { onConflict: 'search_id,date' }
      )

      if (error) throw error
    }
  },

  async getTrendsDataBySearchId(
    searchId: string,
    client?: SupabaseClient
  ): Promise<TrendsDataPoint[]> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('trends_data')
      .select('*')
      .eq('search_id', searchId)
      .order('date', { ascending: true })

    if (error) throw error

    return (data || []).map(row => ({
      date: row.date,
      value: row.value,
    }))
  },

  async upsertKeywordSearch(
    record: KeywordSearchRecord,
    client?: SupabaseClient
  ): Promise<string> {
    const supabase = client ?? getSupabaseClient()

    // user_id 기반 keyword 조회 (RLS 적용됨)
    const { data: existing, error: selectError } = await supabase
      .from('keyword_searches')
      .select('id')
      .eq('keyword', record.keyword)
      .eq('user_id', record.user_id)
      .maybeSingle()

    if (selectError && selectError.code !== 'PGRST116') throw selectError

    if (existing) {
      // UPDATE: 기존 레코드 업데이트
      const { error: updateError } = await supabase
        .from('keyword_searches')
        .update({
          ma13: record.ma13,
          yoy_change: record.yoy_change,
          trends_data: JSON.stringify(record.trends_data),
          searched_at: record.searched_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateError) throw updateError
      return existing.id
    } else {
      // INSERT: 새 레코드 생성
      const { data: insertedData, error: insertError } = await supabase
        .from('keyword_searches')
        .insert({
          id: record.id,
          user_id: record.user_id,
          keyword: record.keyword,
          ma13: record.ma13,
          yoy_change: record.yoy_change,
          trends_data: JSON.stringify(record.trends_data),
          searched_at: record.searched_at,
          created_at: record.created_at,
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      return insertedData.id
    }
  },

  async getKeywordSearch(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<KeywordSearchRecord | null> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('keyword_searches')
      .select('*')
      .eq('id', keywordSearchId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) return null

    return {
      id: data.id,
      user_id: data.user_id,
      keyword: data.keyword,
      ma13: data.ma13,
      yoy_change: data.yoy_change,
      trends_data:
        typeof data.trends_data === 'string'
          ? JSON.parse(data.trends_data)
          : data.trends_data,
      searched_at: data.searched_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  },

  async getKeywordSearchByKeyword(
    keyword: string,
    client?: SupabaseClient
  ): Promise<KeywordSearchRecord | null> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('keyword_searches')
      .select('*')
      .eq('keyword', keyword)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) return null

    return {
      id: data.id,
      user_id: data.user_id,
      keyword: data.keyword,
      ma13: data.ma13,
      yoy_change: data.yoy_change,
      trends_data:
        typeof data.trends_data === 'string'
          ? JSON.parse(data.trends_data)
          : data.trends_data,
      searched_at: data.searched_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  },

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
      ma13: row.ma13,
      yoy_change: row.yoy_change,
      trends_data:
        typeof row.trends_data === 'string'
          ? JSON.parse(row.trends_data)
          : row.trends_data,
      searched_at: row.searched_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
  },

  async deleteKeywordSearch(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<boolean> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('keyword_searches')
      .delete()
      .eq('id', keywordSearchId)
      .select('id')

    if (error) throw error

    return (data && data.length > 0) || false
  },

  async insertKeywordTrendsData(
    keywordSearchId: string,
    trendsData: TrendsDataPoint[],
    client?: SupabaseClient
  ): Promise<void> {
    const supabase = client ?? getSupabaseClient()

    // 빈 배열이면 기존 데이터 삭제만 수행
    if (trendsData.length === 0) {
      const { error: deleteError } = await supabase
        .from('keyword_trends_data')
        .delete()
        .eq('keyword_search_id', keywordSearchId)

      if (deleteError) throw deleteError
      return
    }

    // 배치 UPSERT (100개씩)
    for (let i = 0; i < trendsData.length; i += 100) {
      const batch = trendsData.slice(i, i + 100)
      const { error } = await supabase.from('keyword_trends_data').upsert(
        batch.map(t => ({
          keyword_search_id: keywordSearchId,
          date: t.date,
          value: t.value,
        })),
        { onConflict: 'keyword_search_id,date' }
      )

      if (error) throw error
    }
  },

  async getKeywordTrendsDataByKeywordSearchId(
    keywordSearchId: string,
    client?: SupabaseClient
  ): Promise<TrendsDataPoint[]> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('keyword_trends_data')
      .select('*')
      .eq('keyword_search_id', keywordSearchId)
      .order('date', { ascending: true })

    if (error) throw error

    return (data || []).map(row => ({
      date: row.date,
      value: row.value,
    }))
  },

  async addStockOverlay(
    keywordSearchId: string,
    searchId: string,
    displayOrder: number = 0,
    client?: SupabaseClient
  ): Promise<string> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('keyword_stock_overlays')
      .insert({
        keyword_search_id: keywordSearchId,
        search_id: searchId,
        display_order: displayOrder,
      })
      .select('id')
      .single()

    if (error) throw error

    return data.id
  },

  async removeStockOverlay(
    overlayId: string,
    client?: SupabaseClient
  ): Promise<boolean> {
    const supabase = client ?? getSupabaseClient()

    const { data, error } = await supabase
      .from('keyword_stock_overlays')
      .delete()
      .eq('id', overlayId)
      .select('id')

    if (error) throw error

    return (data && data.length > 0) || false
  },

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
      display_order: row.display_order,
      created_at: row.created_at,
    }))
  },
}

/**
 * Database Adapter Export
 * Phase 6: Supabase 단일 기반으로 통합되어 supabaseAdapter만 사용합니다.
 */
export const db = supabaseAdapter
