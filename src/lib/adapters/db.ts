/**
 * Database Adapter Pattern
 *
 * Abstracts database operations to support multiple providers (SQLite, Supabase).
 * This enables gradual migration from SQLite to Supabase without changing application logic.
 *
 * IMPORTANT: Transaction handling is internal to each adapter.
 * Callers don't need to know about transaction details.
 */

import { SearchRecord, PriceDataPoint, TrendsDataPoint } from '@/types/database'
import { env } from '@/lib/env'

// Import SQLite implementations from db-helpers
import {
  upsertSearchRecord,
  getSearchRecord,
  getSearchRecordByTicker,
  getAllSearchRecords,
  deleteSearchRecord,
  savePriceData,
  getPriceData,
  saveTrendsData,
  getTrendsData,
} from '../db-helpers'

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
 * SQLite Adapter Implementation
 * Uses better-sqlite3 for local database operations.
 * Wraps synchronous db-helpers.ts functions with async interface.
 *
 * This allows SQLite to work with the async DbAdapter interface,
 * enabling gradual migration to Supabase without refactoring db-helpers.ts
 */
export const sqliteAdapter: DbAdapter = {
  async upsertSearch(record: SearchRecord): Promise<string> {
    return Promise.resolve(upsertSearchRecord(record))
  },

  async getSearch(searchId: string): Promise<SearchRecord | null> {
    return Promise.resolve(getSearchRecord(searchId))
  },

  async getSearchByTicker(ticker: string): Promise<SearchRecord | null> {
    return Promise.resolve(getSearchRecordByTicker(ticker))
  },

  async getAllSearches(): Promise<SearchRecord[]> {
    return Promise.resolve(getAllSearchRecords())
  },

  async deleteSearch(searchId: string): Promise<boolean> {
    return Promise.resolve(deleteSearchRecord(searchId))
  },

  async insertPriceData(
    searchId: string,
    priceData: PriceDataPoint[]
  ): Promise<void> {
    return Promise.resolve(savePriceData(searchId, priceData))
  },

  async getPriceDataBySearchId(searchId: string): Promise<PriceDataPoint[]> {
    return Promise.resolve(getPriceData(searchId))
  },

  async insertTrendsData(
    searchId: string,
    trendsData: TrendsDataPoint[]
  ): Promise<void> {
    return Promise.resolve(saveTrendsData(searchId, trendsData))
  },

  async getTrendsDataBySearchId(searchId: string): Promise<TrendsDataPoint[]> {
    return Promise.resolve(getTrendsData(searchId))
  },
}

/**
 * Helper function for Supabase upsert operation
 * Extracted to support Phase 3 dual-write strategy
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
 * Provides database operations using Supabase (PostgreSQL) as the provider.
 * Implements the DbAdapter interface with Supabase client methods.
 *
 * All operations are async and use Supabase's Postgres API.
 * Includes proper error handling and data transformation.
 *
 * Phase 3: Dual-Write Strategy
 * When performing upsertSearch, this adapter now writes to both SQLite and Supabase.
 * SQLite is written first (synchronous, mandatory).
 * Supabase is written second (asynchronous, optional - failures are logged but don't fail the request).
 */
export const supabaseAdapter: DbAdapter = {
  async upsertSearch(record: SearchRecord): Promise<string> {
    // Phase 3: Step 1 - Write to SQLite first (synchronous, mandatory)
    const sqliteId = await sqliteAdapter.upsertSearch(record)

    // Phase 3: Step 2 - Write to Supabase (asynchronous, optional)
    try {
      await performSupabaseUpsert(record)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(
        `[Phase 3] Supabase upsert failed for ticker=${record.ticker}:`,
        errorMsg
      )
    }

    // Phase 3: Step 3 - Return SQLite ID (ensures synchronous write always succeeds)
    return sqliteId
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
    // Phase 5: Step 1 - Write to SQLite first (synchronous, mandatory)
    await sqliteAdapter.insertPriceData(searchId, priceData)

    // Phase 5: Step 2 - Write to Supabase (asynchronous, optional)
    try {
      const supabase = getSupabaseClient()

      // 기존 price_data 삭제
      const { error: deleteError } = await supabase
        .from('price_data')
        .delete()
        .eq('search_id', searchId)

      if (deleteError) throw deleteError

      // 빈 배열이면 여기서 종료
      if (priceData.length === 0) {
        return
      }

      // 배치 INSERT (100개씩)
      for (let i = 0; i < priceData.length; i += 100) {
        const batch = priceData.slice(i, i + 100)
        const { error } = await supabase.from('price_data').insert(
          batch.map(p => ({
            search_id: searchId,
            date: p.date,
            close: p.close,
            open: p.open,
            high: p.high,
            low: p.low,
            volume: p.volume,
          }))
        )

        if (error) throw error
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(
        `[Dual-Write] Supabase insertPriceData failed for searchId=${searchId}:`,
        errorMsg
      )
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
    // Phase 5: Step 1 - Write to SQLite first (synchronous, mandatory)
    await sqliteAdapter.insertTrendsData(searchId, trendsData)

    // Phase 5: Step 2 - Write to Supabase (asynchronous, optional)
    try {
      const supabase = getSupabaseClient()

      // 기존 trends_data 삭제
      const { error: deleteError } = await supabase
        .from('trends_data')
        .delete()
        .eq('search_id', searchId)

      if (deleteError) throw deleteError

      // 빈 배열이면 여기서 종료
      if (trendsData.length === 0) {
        return
      }

      // 배치 INSERT (100개씩)
      for (let i = 0; i < trendsData.length; i += 100) {
        const batch = trendsData.slice(i, i + 100)
        const { error } = await supabase.from('trends_data').insert(
          batch.map(t => ({
            search_id: searchId,
            date: t.date,
            value: t.value,
          }))
        )

        if (error) throw error
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(
        `[Dual-Write] Supabase insertTrendsData failed for searchId=${searchId}:`,
        errorMsg
      )
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
 * Shadow Read Adapter Implementation
 * Phase 5: 데이터 정합성 검증을 위한 Shadow Read 모드
 *
 * 읽기 메서드: SQLite 읽기 + Supabase 병렬 읽기 + 비교 + 로깅
 * - SQLite 결과를 반환하되, Supabase 결과와 비교하여 불일치 로깅
 * - Supabase 오류는 로깅만 하고 무시
 *
 * 쓰기 메서드: SQLite만 사용
 * - Shadow Read는 읽기만 검증하는 단계
 *
 * 용도:
 * - DB_READ_MODE='supabase' && DB_WRITE_MODE='sqlite': Shadow Read + 새 데이터는 SQLite만 쓰기
 * - DB_READ_MODE='supabase' && DB_WRITE_MODE='supabase': 아직 구현 안 함 (fallbackAdapter 사용)
 */
const shadowReadAdapter: DbAdapter = {
  async upsertSearch(record: SearchRecord): Promise<string> {
    return await sqliteAdapter.upsertSearch(record)
  },

  async getSearch(searchId: string): Promise<SearchRecord | null> {
    const sqliteResult = await sqliteAdapter.getSearch(searchId)

    // Supabase 병렬 읽기 (비교용)
    try {
      const supabaseResult = await supabaseAdapter.getSearch(searchId)

      if (JSON.stringify(sqliteResult) !== JSON.stringify(supabaseResult)) {
        console.warn(
          `[Shadow Read] table=searches, searchId=${searchId}, mismatch detected`
        )
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(
        `[Shadow Read] Supabase getSearch failed for searchId=${searchId}: ${errorMsg}`
      )
    }

    return sqliteResult
  },

  async getSearchByTicker(ticker: string): Promise<SearchRecord | null> {
    const sqliteResult = await sqliteAdapter.getSearchByTicker(ticker)

    // Supabase 병렬 읽기 (비교용)
    try {
      const supabaseResult = await supabaseAdapter.getSearchByTicker(ticker)

      if (JSON.stringify(sqliteResult) !== JSON.stringify(supabaseResult)) {
        console.warn(
          `[Shadow Read] table=searches, ticker=${ticker}, mismatch detected`
        )
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(
        `[Shadow Read] Supabase getSearchByTicker failed for ticker=${ticker}: ${errorMsg}`
      )
    }

    return sqliteResult
  },

  async getAllSearches(): Promise<SearchRecord[]> {
    const sqliteResult = await sqliteAdapter.getAllSearches()

    // Supabase 병렬 읽기 (비교용)
    try {
      const supabaseResult = await supabaseAdapter.getAllSearches()

      if (JSON.stringify(sqliteResult) !== JSON.stringify(supabaseResult)) {
        console.warn(
          `[Shadow Read] table=searches, getAllSearches mismatch: sqlite=${sqliteResult.length}, supabase=${supabaseResult.length}`
        )
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(`[Shadow Read] Supabase getAllSearches failed: ${errorMsg}`)
    }

    return sqliteResult
  },

  async deleteSearch(searchId: string): Promise<boolean> {
    return await sqliteAdapter.deleteSearch(searchId)
  },

  async insertPriceData(
    searchId: string,
    priceData: PriceDataPoint[]
  ): Promise<void> {
    return await sqliteAdapter.insertPriceData(searchId, priceData)
  },

  async getPriceDataBySearchId(searchId: string): Promise<PriceDataPoint[]> {
    const sqliteResult = await sqliteAdapter.getPriceDataBySearchId(searchId)

    // Supabase 병렬 읽기 (비교용)
    try {
      const supabaseResult =
        await supabaseAdapter.getPriceDataBySearchId(searchId)

      if (JSON.stringify(sqliteResult) !== JSON.stringify(supabaseResult)) {
        console.warn(
          `[Shadow Read] table=price_data, searchId=${searchId}, mismatch: sqlite=${sqliteResult.length}, supabase=${supabaseResult.length}`
        )
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(
        `[Shadow Read] Supabase getPriceDataBySearchId failed for searchId=${searchId}: ${errorMsg}`
      )
    }

    return sqliteResult
  },

  async insertTrendsData(
    searchId: string,
    trendsData: TrendsDataPoint[]
  ): Promise<void> {
    return await sqliteAdapter.insertTrendsData(searchId, trendsData)
  },

  async getTrendsDataBySearchId(searchId: string): Promise<TrendsDataPoint[]> {
    const sqliteResult = await sqliteAdapter.getTrendsDataBySearchId(searchId)

    // Supabase 병렬 읽기 (비교용)
    try {
      const supabaseResult =
        await supabaseAdapter.getTrendsDataBySearchId(searchId)

      if (JSON.stringify(sqliteResult) !== JSON.stringify(supabaseResult)) {
        console.warn(
          `[Shadow Read] table=trends_data, searchId=${searchId}, mismatch: sqlite=${sqliteResult.length}, supabase=${supabaseResult.length}`
        )
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(
        `[Shadow Read] Supabase getTrendsDataBySearchId failed for searchId=${searchId}: ${errorMsg}`
      )
    }

    return sqliteResult
  },
}

/**
 * Fallback Adapter Implementation
 * Supabase Primary 모드에서 Supabase 실패 시 SQLite로 자동 폴백합니다.
 *
 * 읽기 메서드: try Supabase → catch → SQLite 폴백
 * 쓰기 메서드: Supabase 전용 (SQLite 이중 쓰기 없음, 폴백 불가)
 *
 * NOTE: Phase 5 Primary 모드에서 실제로는 Supabase만 씁니다.
 * supabaseAdapter.upsertSearch()가 SQLite 이중 쓰기를 포함하므로,
 * performSupabaseUpsert()를 직접 호출하여 Supabase 전용 경로를 사용합니다.
 */
const fallbackAdapter: DbAdapter = {
  async upsertSearch(record: SearchRecord): Promise<string> {
    try {
      // Supabase only (no SQLite dual-write)
      return await performSupabaseUpsert(record)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      throw new Error(
        `[Fallback] upsertSearch failed (no fallback for writes): ${errorMsg}`
      )
    }
  },

  async getSearch(searchId: string): Promise<SearchRecord | null> {
    try {
      return await supabaseAdapter.getSearch(searchId)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(
        `[Fallback] getSearch failed for searchId=${searchId}, falling back to SQLite: ${errorMsg}`
      )
      return await sqliteAdapter.getSearch(searchId)
    }
  },

  async getSearchByTicker(ticker: string): Promise<SearchRecord | null> {
    try {
      return await supabaseAdapter.getSearchByTicker(ticker)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(
        `[Fallback] getSearchByTicker failed for ticker=${ticker}, falling back to SQLite: ${errorMsg}`
      )
      return await sqliteAdapter.getSearchByTicker(ticker)
    }
  },

  async getAllSearches(): Promise<SearchRecord[]> {
    try {
      return await supabaseAdapter.getAllSearches()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(
        `[Fallback] getAllSearches failed, falling back to SQLite: ${errorMsg}`
      )
      return await sqliteAdapter.getAllSearches()
    }
  },

  async deleteSearch(searchId: string): Promise<boolean> {
    try {
      return await supabaseAdapter.deleteSearch(searchId)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      throw new Error(
        `[Fallback] deleteSearch failed (no fallback for writes): ${errorMsg}`
      )
    }
  },

  async insertPriceData(
    searchId: string,
    priceData: PriceDataPoint[]
  ): Promise<void> {
    try {
      return await supabaseAdapter.insertPriceData(searchId, priceData)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      throw new Error(
        `[Fallback] insertPriceData failed (no fallback for writes): ${errorMsg}`
      )
    }
  },

  async getPriceDataBySearchId(searchId: string): Promise<PriceDataPoint[]> {
    try {
      return await supabaseAdapter.getPriceDataBySearchId(searchId)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(
        `[Fallback] getPriceDataBySearchId failed for searchId=${searchId}, falling back to SQLite: ${errorMsg}`
      )
      return await sqliteAdapter.getPriceDataBySearchId(searchId)
    }
  },

  async insertTrendsData(
    searchId: string,
    trendsData: TrendsDataPoint[]
  ): Promise<void> {
    try {
      return await supabaseAdapter.insertTrendsData(searchId, trendsData)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      throw new Error(
        `[Fallback] insertTrendsData failed (no fallback for writes): ${errorMsg}`
      )
    }
  },

  async getTrendsDataBySearchId(searchId: string): Promise<TrendsDataPoint[]> {
    try {
      return await supabaseAdapter.getTrendsDataBySearchId(searchId)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(
        `[Fallback] getTrendsDataBySearchId failed for searchId=${searchId}, falling back to SQLite: ${errorMsg}`
      )
      return await sqliteAdapter.getTrendsDataBySearchId(searchId)
    }
  },
}

/**
 * Adapter Provider Selection
 * Determines which database adapter to use based on validated environment variables.
 *
 * Phase 4 Logic:
 * - DB_READ_MODE='supabase' && DB_WRITE_MODE='supabase': fallbackAdapter (Supabase Primary + SQLite fallback for reads)
 * - DB_WRITE_MODE='supabase' && DB_READ_MODE='sqlite': supabaseAdapter (Phase 3 dual-write)
 * - DB_WRITE_MODE='sqlite': sqliteAdapter (SQLite Primary)
 * - Fallback: USE_SUPABASE=true (legacy, for backward compatibility)
 */
function getAdapter(): DbAdapter {
  // Phase 5: DB_READ_MODE and DB_WRITE_MODE based selection (highest priority)

  // Supabase Primary mode: read from Supabase (with SQLite fallback), write to both
  // Using supabaseAdapter for dual-write which ensures SQLite first, then Supabase
  if (env.DB_READ_MODE === 'supabase' && env.DB_WRITE_MODE === 'supabase') {
    return supabaseAdapter
  }

  // Shadow Read mode: read from Supabase (with comparison), write to SQLite only
  if (env.DB_READ_MODE === 'supabase' && env.DB_WRITE_MODE === 'sqlite') {
    // Phase 5: Shadow Read with SQLite write only
    return shadowReadAdapter
  }

  // Dual-Write mode: read from SQLite, write to both SQLite and Supabase
  if (env.DB_WRITE_MODE === 'supabase' && env.DB_READ_MODE === 'sqlite') {
    // Phase 5: Dual-Write with Shadow Read validation
    return shadowReadAdapter
  }

  // Legacy mode: USE_SUPABASE=true (backward compatibility)
  if (env.USE_SUPABASE) {
    return supabaseAdapter
  }

  // SQLite Primary mode (default)
  return sqliteAdapter
}

/**
 * Current Database Adapter
 * Automatically selected based on environment configuration.
 * Use this for all database operations.
 *
 * NOTE: Selection happens at module load time.
 * Changing DB_READ_MODE, DB_WRITE_MODE, or USE_SUPABASE environment variables requires server restart.
 */
export const db = getAdapter()
