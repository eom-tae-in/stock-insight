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
  const { stringifySearchRecord } = await import('../type-guards')
  const raw = stringifySearchRecord(record)

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
        company_name: raw.company_name,
        current_price: raw.current_price,
        previous_close: raw.previous_close,
        ma13: raw.ma13,
        yoy_change: raw.yoy_change,
        week52_high: raw.week52_high,
        week52_low: raw.week52_low,
        price_data: raw.price_data,
        trends_data: raw.trends_data,
        last_updated_at: raw.last_updated_at,
        searched_at: raw.searched_at,
      })
      .eq('id', existing.id)

    if (error) throw error
    return existing.id
  } else {
    // INSERT
    const { data, error } = await supabase
      .from('searches')
      .insert({
        id: raw.id,
        ticker: raw.ticker,
        company_name: raw.company_name,
        current_price: raw.current_price,
        previous_close: raw.previous_close,
        ma13: raw.ma13,
        yoy_change: raw.yoy_change,
        week52_high: raw.week52_high,
        week52_low: raw.week52_low,
        price_data: raw.price_data,
        trends_data: raw.trends_data,
        last_updated_at: raw.last_updated_at,
        searched_at: raw.searched_at,
        created_at: raw.created_at,
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
    const { parseSearchRecordRaw } = await import('../type-guards')

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
    const { parseSearchRecordRaw } = await import('../type-guards')

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
    const { parseSearchRecordRaw } = await import('../type-guards')

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
    _searchId: string,
    _priceData: PriceDataPoint[]
  ): Promise<void> {
    // TODO: Phase 5 - Implement price_data table migration
    throw new Error('supabaseAdapter.insertPriceData not implemented (Phase 5)')
  },

  async getPriceDataBySearchId(_searchId: string): Promise<PriceDataPoint[]> {
    // TODO: Phase 5 - Implement price_data table migration
    throw new Error(
      'supabaseAdapter.getPriceDataBySearchId not implemented (Phase 5)'
    )
  },

  async insertTrendsData(
    _searchId: string,
    _trendsData: TrendsDataPoint[]
  ): Promise<void> {
    // TODO: Phase 5 - Implement trends_data table migration
    throw new Error(
      'supabaseAdapter.insertTrendsData not implemented (Phase 5)'
    )
  },

  async getTrendsDataBySearchId(_searchId: string): Promise<TrendsDataPoint[]> {
    // TODO: Phase 5 - Implement trends_data table migration
    throw new Error(
      'supabaseAdapter.getTrendsDataBySearchId not implemented (Phase 5)'
    )
  },
}

/**
 * Adapter Provider Selection
 * Determines which database adapter to use based on validated environment variables.
 * Uses env.USE_SUPABASE (already boolean from env.ts Zod validation).
 */
function getAdapter(): DbAdapter {
  if (env.USE_SUPABASE) {
    return supabaseAdapter
  } else {
    return sqliteAdapter
  }
}

/**
 * Current Database Adapter
 * Automatically selected based on environment configuration.
 * Use this for all database operations.
 *
 * NOTE: Selection happens at module load time.
 * Changing USE_SUPABASE environment variable requires server restart.
 */
export const db = getAdapter()
