import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchCachedStockData,
  STOCK_DATA_INTERVAL,
  STOCK_DATA_PERIOD,
  type StockDataInterval,
  type StockDataPeriod,
} from '@/server/cached-stock-service'
import { calculateMetrics, getWeeklyOHLC } from '@/lib/calculations'
import type { PriceDataPoint, SearchRecord } from '@/types'
import type { StockPriceRepository } from './repositories/stock-price-repository'
import type { StockSearchRepository } from './repositories/stock-search-repository'
import { SupabaseStockPriceRepository } from './repositories/supabase-stock-price-repository'
import { SupabaseStockSearchRepository } from './repositories/supabase-stock-search-repository'

export type StockAnalysisData = {
  ticker: string
  companyName: string
  currentPrice: number
  previousClose: number
  currency?: string
  period: StockDataPeriod
  interval: StockDataInterval
  priceData: PriceDataPoint[]
}

export type SaveStockAnalysisInput = {
  ticker: string
  companyName: string
  currency?: string
  priceData: PriceDataPoint[]
}

export class StockAnalysisServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
  }
}

function toStockAnalysisData(
  ticker: string,
  stockData: Awaited<ReturnType<typeof fetchCachedStockData>>,
  period: StockDataPeriod,
  interval: StockDataInterval
): StockAnalysisData {
  return {
    ticker,
    companyName: stockData.companyName,
    currentPrice: stockData.currentPrice,
    previousClose: stockData.previousClose,
    currency: stockData.currency,
    period,
    interval,
    priceData: stockData.priceData,
  }
}

export async function getStockAnalysisData(
  ticker: string,
  period: StockDataPeriod = STOCK_DATA_PERIOD,
  interval: StockDataInterval = STOCK_DATA_INTERVAL
) {
  const normalizedTicker = ticker.trim().toUpperCase()
  if (!normalizedTicker) return null

  const stockData = await fetchCachedStockData(
    normalizedTicker,
    period,
    interval
  )
  return toStockAnalysisData(normalizedTicker, stockData, period, interval)
}

export async function saveStockAnalysisAsSearch(
  supabase: SupabaseClient,
  userId: string,
  input: SaveStockAnalysisInput
) {
  return createSupabaseStockAnalysisService(supabase).saveStockAnalysisAsSearch(
    userId,
    input
  )
}

export function createStockAnalysisService(
  searchRepository: StockSearchRepository,
  priceRepository: StockPriceRepository
) {
  return {
    async saveStockAnalysisAsSearch(
      userId: string,
      input: SaveStockAnalysisInput
    ) {
      const normalizedTicker = input.ticker.trim().toUpperCase()
      if (!normalizedTicker || input.priceData.length === 0) {
        throw new StockAnalysisServiceError(
          'STOCK_DATA_NOT_FOUND',
          '종목 데이터를 찾을 수 없습니다.',
          404
        )
      }

      const existingSearch = await searchRepository.findByTicker(
        userId,
        normalizedTicker
      )
      if (existingSearch) {
        throw new StockAnalysisServiceError(
          'ALREADY_SAVED',
          '이미 저장된 종목입니다.',
          409
        )
      }

      const now = new Date()
      const metrics = calculateMetrics(input.priceData)
      const weeklyOHLC = getWeeklyOHLC(input.priceData)

      const searchRecord: SearchRecord = {
        id: crypto.randomUUID(),
        ticker: normalizedTicker,
        company_name: input.companyName,
        currency: input.currency,
        weekly_open: weeklyOHLC.open,
        weekly_high: weeklyOHLC.high,
        weekly_low: weeklyOHLC.low,
        current_price: metrics.currentPrice,
        previous_close: metrics.previousClose,
        ma13: metrics.ma13,
        yoy_change: metrics.yoyChange,
        price_data: input.priceData,
        searched_at: now.toISOString(),
        created_at: now.toISOString(),
        last_updated_at: now.toISOString(),
        user_id: userId,
      }

      const savedId = await searchRepository.upsert(searchRecord)

      try {
        await priceRepository.upsertMany(savedId, input.priceData)
      } catch (error) {
        await searchRepository.deleteById(userId, savedId)
        throw error
      }

      return {
        id: savedId,
        ticker: normalizedTicker,
      }
    },
  }
}

function createSupabaseStockAnalysisService(supabase: SupabaseClient) {
  const priceRepository = new SupabaseStockPriceRepository(supabase)
  const searchRepository = new SupabaseStockSearchRepository(
    supabase,
    priceRepository
  )
  return createStockAnalysisService(searchRepository, priceRepository)
}
