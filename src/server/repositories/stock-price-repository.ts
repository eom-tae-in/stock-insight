import type { PriceDataPoint } from '@/types/database'

export interface StockPriceRepository {
  findBySearchId(searchId: string): Promise<PriceDataPoint[]>

  upsertMany(searchId: string, priceData: PriceDataPoint[]): Promise<void>

  deleteBefore(searchId: string, date: string): Promise<void>
}
