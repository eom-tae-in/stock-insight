import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateMetrics, getWeeklyOHLC } from '@/lib/calculations'
import { fetchCachedStockData } from '@/server/cached-stock-service'
import type { StockPriceRepository } from './repositories/stock-price-repository'
import type { StockSearchRepository } from './repositories/stock-search-repository'
import { SupabaseStockPriceRepository } from './repositories/supabase-stock-price-repository'
import { SupabaseStockSearchRepository } from './repositories/supabase-stock-search-repository'

export class StockRefreshServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
  }
}

export async function refreshSavedSearch(
  supabase: SupabaseClient,
  userId: string,
  searchId: string
) {
  return createSupabaseStockRefreshService(supabase).refreshSavedSearch(
    userId,
    searchId
  )
}

export function createStockRefreshService(
  searchRepository: StockSearchRepository,
  priceRepository: StockPriceRepository
) {
  return {
    async refreshSavedSearch(userId: string, searchId: string) {
      const existingSearch = await searchRepository.findById(userId, searchId)
      if (!existingSearch) {
        throw new StockRefreshServiceError(
          'NOT_FOUND',
          '해당 종목을 찾을 수 없습니다.',
          404
        )
      }

      const stockData = await fetchCachedStockData(existingSearch.ticker)
      const metrics = calculateMetrics(stockData.priceData)
      const weeklyOHLC = getWeeklyOHLC(stockData.priceData)
      const now = new Date().toISOString()

      await searchRepository.update(userId, searchId, {
        company_name: stockData.companyName,
        currency: stockData.currency ?? existingSearch.currency ?? 'USD',
        weekly_open: weeklyOHLC.open,
        weekly_high: weeklyOHLC.high,
        weekly_low: weeklyOHLC.low,
        current_price: metrics.currentPrice,
        previous_close: metrics.previousClose,
        ma13: metrics.ma13,
        yoy_change: metrics.yoyChange,
        last_updated_at: now,
      })

      const firstDate = stockData.priceData[0]?.date
      if (firstDate) {
        await priceRepository.deleteBefore(searchId, firstDate)
      }

      await priceRepository.upsertMany(searchId, stockData.priceData)

      const refreshedSearch = await searchRepository.findById(userId, searchId)
      if (!refreshedSearch) {
        throw new StockRefreshServiceError(
          'REFRESH_FAILED',
          '갱신된 종목을 다시 조회하지 못했습니다.',
          500
        )
      }

      return refreshedSearch
    },
  }
}

function createSupabaseStockRefreshService(supabase: SupabaseClient) {
  const priceRepository = new SupabaseStockPriceRepository(supabase)
  const searchRepository = new SupabaseStockSearchRepository(
    supabase,
    priceRepository
  )
  return createStockRefreshService(searchRepository, priceRepository)
}
