import type { SupabaseClient } from '@supabase/supabase-js'
import type { PriceDataPoint } from '@/types/database'
import type { StockPriceRepository } from './stock-price-repository'

export class SupabaseStockPriceRepository implements StockPriceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findBySearchId(searchId: string): Promise<PriceDataPoint[]> {
    const { data, error } = await this.client
      .from('stock_price_data')
      .select('*')
      .eq('search_id', searchId)
      .order('date', { ascending: true })

    if (error) throw error

    return (data ?? []).map(row => ({
      date: row.date,
      close: row.close,
      open: row.open,
      high: row.high,
      low: row.low,
      volume: row.volume,
    }))
  }

  async upsertMany(
    searchId: string,
    priceData: PriceDataPoint[]
  ): Promise<void> {
    if (priceData.length === 0) return

    const records = priceData.map(point => ({
      search_id: searchId,
      date: point.date,
      close: point.close,
      open: point.open,
      high: point.high,
      low: point.low,
      volume: point.volume,
    }))

    const { error } = await this.client
      .from('stock_price_data')
      .upsert(records, { onConflict: 'search_id,date' })

    if (error) throw error
  }

  async deleteBefore(searchId: string, date: string): Promise<void> {
    const { error } = await this.client
      .from('stock_price_data')
      .delete()
      .eq('search_id', searchId)
      .lt('date', date)

    if (error) throw error
  }
}
