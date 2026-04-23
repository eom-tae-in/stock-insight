import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateMetrics, getWeeklyOHLC } from '@/lib/calculations'
import { getSearchById, insertPriceData } from '@/lib/db/queries'
import { fetchCachedStockData } from '@/server/cached-stock-service'

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
  const existingSearch = await getSearchById(searchId, userId, supabase)
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

  const { error } = await supabase
    .from('searches')
    .update({
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
    .eq('id', searchId)
    .eq('user_id', userId)

  if (error) throw error

  const firstDate = stockData.priceData[0]?.date
  if (firstDate) {
    const { error: pruneError } = await supabase
      .from('stock_price_data')
      .delete()
      .eq('search_id', searchId)
      .lt('date', firstDate)

    if (pruneError) throw pruneError
  }

  await insertPriceData(searchId, stockData.priceData, supabase)

  const refreshedSearch = await getSearchById(searchId, userId, supabase)
  if (!refreshedSearch) {
    throw new StockRefreshServiceError(
      'REFRESH_FAILED',
      '갱신된 종목을 다시 조회하지 못했습니다.',
      500
    )
  }

  return refreshedSearch
}
