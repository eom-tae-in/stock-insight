/**
 * Database Adapter - Supabase Implementation
 *
 * Phase 6: SQLite 제거 후 Supabase 단일 DB 기반으로 통합
 * 모든 데이터베이스 작업을 Supabase(PostgreSQL)를 통해 수행합니다.
 *
 * IMPORTANT: Transaction handling은 각 adapter 메서드 내부에서 처리됩니다.
 * Callers는 transaction 세부사항을 알 필요가 없습니다.
 */

import { SearchRecord, PriceDataPoint, TrendsDataPoint } from '@/types/database'

// Import Supabase client
import { getSupabaseClient } from '@/lib/supabase'

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
   */
  upsertSearch(record: SearchRecord): Promise<string>

  /**
   * Get a search record by id
   */
  getSearch(searchId: string): Promise<SearchRecord | null>

  /**
   * Get a search record by ticker symbol
   */
  getSearchByTicker(ticker: string): Promise<SearchRecord | null>

  /**
   * Get all search records (most recent first)
   */
  getAllSearches(): Promise<SearchRecord[]>

  /**
   * Delete a search record (cascades to related data)
   * Returns true if deleted, false if not found
   * Internally handles transaction if needed
   */
  deleteSearch(searchId: string): Promise<boolean>

  /**
   * Save price data for a search
   * Replaces existing data for this search
   * Internally handles transaction if needed
   */
  insertPriceData(searchId: string, priceData: PriceDataPoint[]): Promise<void>

  /**
   * Get price data for a search
   */
  getPriceDataBySearchId(searchId: string): Promise<PriceDataPoint[]>

  /**
   * Save trends data for a search
   * Replaces existing data for this search
   * Internally handles transaction if needed
   */
  insertTrendsData(
    searchId: string,
    trendsData: TrendsDataPoint[]
  ): Promise<void>

  /**
   * Get trends data for a search
   */
  getTrendsDataBySearchId(searchId: string): Promise<TrendsDataPoint[]>
}

/**
 * Helper function for Supabase upsert operation
 */
async function performSupabaseUpsert(record: SearchRecord): Promise<string> {
  const supabase = getSupabaseClient()

  const { data: existing } = await supabase
    .from('searches')
    .select('id')
    .eq('ticker', record.ticker)
    .single()

  if (existing) {
    // UPDATE
    const { error } = await supabase
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

    if (error) throw error
    return existing.id
  } else {
    // INSERT
    const { data, error } = await supabase
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
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
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
  async upsertSearch(record: SearchRecord): Promise<string> {
    return await performSupabaseUpsert(record)
  },

  async getSearch(searchId: string): Promise<SearchRecord | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .eq('id', searchId)
      .single()

    if (error && error.code === 'PGRST116') {
      // Not found
      return null
    }
    if (error) throw error

    return parseSearchRecordRaw(data)
  },

  async getSearchByTicker(ticker: string): Promise<SearchRecord | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .eq('ticker', ticker)
      .single()

    if (error && error.code === 'PGRST116') {
      // Not found
      return null
    }
    if (error) throw error

    return parseSearchRecordRaw(data)
  },

  async getAllSearches(): Promise<SearchRecord[]> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .order('searched_at', { ascending: false })

    if (error) throw error

    return (data || []).map(parseSearchRecordRaw)
  },

  async deleteSearch(searchId: string): Promise<boolean> {
    const supabase = getSupabaseClient()

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
    priceData: PriceDataPoint[]
  ): Promise<void> {
    const supabase = getSupabaseClient()

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

  async getPriceDataBySearchId(searchId: string): Promise<PriceDataPoint[]> {
    const supabase = getSupabaseClient()

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
    trendsData: TrendsDataPoint[]
  ): Promise<void> {
    const supabase = getSupabaseClient()

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

  async getTrendsDataBySearchId(searchId: string): Promise<TrendsDataPoint[]> {
    const supabase = getSupabaseClient()

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
}

/**
 * Database Adapter Export
 * Phase 6: Supabase 단일 기반으로 통합되어 supabaseAdapter만 사용합니다.
 */
export const db = supabaseAdapter
