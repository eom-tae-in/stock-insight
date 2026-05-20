import type { SupabaseClient } from '@supabase/supabase-js'
import type { SearchRecord } from '@/types/database'
import type { StockPriceRepository } from './stock-price-repository'
import type {
  StockSearchRepository,
  StockSearchUpdateData,
  StockSuggestion,
} from './stock-search-repository'
import { SupabaseStockPriceRepository } from './supabase-stock-price-repository'

type SearchRow = {
  id: string
  user_id: string
  ticker: string
  company_name: string
  currency?: string
  weekly_open?: number
  weekly_high?: number
  weekly_low?: number
  current_price?: number
  previous_close?: number
  ma13?: number
  yoy_change?: number
  last_updated_at?: string
  searched_at: string
  created_at?: string
}

export class SupabaseStockSearchRepository implements StockSearchRepository {
  private readonly priceRepository: StockPriceRepository

  constructor(
    private readonly client: SupabaseClient,
    priceRepository?: StockPriceRepository
  ) {
    this.priceRepository =
      priceRepository ?? new SupabaseStockPriceRepository(client)
  }

  async upsert(record: SearchRecord): Promise<string> {
    const { data, error } = await this.client
      .from('searches')
      .upsert(
        {
          user_id: record.user_id,
          ticker: record.ticker.toUpperCase(),
          company_name: record.company_name,
          currency: record.currency || 'USD',
          weekly_open: record.weekly_open,
          weekly_high: record.weekly_high,
          weekly_low: record.weekly_low,
          searched_at: record.searched_at,
          current_price: record.current_price,
          previous_close: record.previous_close,
          ma13: record.ma13,
          yoy_change: record.yoy_change,
          last_updated_at: record.last_updated_at,
        },
        { onConflict: 'user_id,ticker' }
      )
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  async findById(
    userId: string,
    searchId: string
  ): Promise<SearchRecord | null> {
    const { data, error } = await this.client
      .from('searches')
      .select('*')
      .eq('id', searchId)
      .eq('user_id', userId)
      .single()

    if (error) return null
    return this.toSearchRecord(data as SearchRow)
  }

  async findByTicker(
    userId: string,
    ticker: string
  ): Promise<SearchRecord | null> {
    const { data, error } = await this.client
      .from('searches')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .eq('user_id', userId)
      .single()

    if (error) return null
    return this.toSearchRecord(data as SearchRow)
  }

  async findManyByUserId(userId: string): Promise<SearchRecord[]> {
    const { data, error } = await this.client
      .from('searches')
      .select('*')
      .eq('user_id', userId)
      .order('searched_at', { ascending: false })

    if (error) throw error

    return Promise.all(
      ((data ?? []) as SearchRow[]).map(row => this.toSearchRecord(row))
    )
  }

  async findSuggestions(
    query: string,
    limit: number
  ): Promise<StockSuggestion[]> {
    const { data, error } = await this.client
      .from('searches')
      .select('ticker, company_name')
      .or(`ticker.ilike.${query}%,company_name.ilike.%${query}%`)
      .order('ticker', { ascending: true })
      .limit(limit)

    if (error) throw error

    return (data ?? []).map(row => ({
      ticker: row.ticker,
      companyName: row.company_name,
    }))
  }

  async update(
    userId: string,
    searchId: string,
    data: StockSearchUpdateData
  ): Promise<boolean> {
    const { error } = await this.client
      .from('searches')
      .update(data)
      .eq('id', searchId)
      .eq('user_id', userId)

    if (error) throw error
    return true
  }

  async deleteById(userId: string, searchId: string): Promise<boolean> {
    const { error } = await this.client
      .from('searches')
      .delete()
      .eq('id', searchId)
      .eq('user_id', userId)

    return !error
  }

  private async toSearchRecord(row: SearchRow): Promise<SearchRecord> {
    const priceData = await this.priceRepository.findBySearchId(row.id)

    return {
      id: row.id,
      user_id: row.user_id,
      ticker: row.ticker,
      company_name: row.company_name,
      currency: row.currency,
      weekly_open: row.weekly_open,
      weekly_high: row.weekly_high,
      weekly_low: row.weekly_low,
      current_price:
        row.current_price ??
        (priceData.length > 0 ? priceData[priceData.length - 1].close : 0),
      previous_close: row.previous_close,
      ma13: row.ma13,
      yoy_change: row.yoy_change,
      price_data: priceData,
      trends_data: [],
      last_updated_at: row.last_updated_at,
      searched_at: row.searched_at,
      created_at: row.created_at,
    }
  }
}
