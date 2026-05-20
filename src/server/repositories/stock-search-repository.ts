import type { SearchRecord } from '@/types/database'

export type StockSearchUpdateData = Partial<
  Pick<
    SearchRecord,
    | 'company_name'
    | 'currency'
    | 'weekly_open'
    | 'weekly_high'
    | 'weekly_low'
    | 'current_price'
    | 'previous_close'
    | 'ma13'
    | 'yoy_change'
    | 'last_updated_at'
  >
>

export type StockSuggestion = {
  ticker: string
  companyName: string
}

export interface StockSearchRepository {
  upsert(record: SearchRecord): Promise<string>

  findById(userId: string, searchId: string): Promise<SearchRecord | null>

  findByTicker(userId: string, ticker: string): Promise<SearchRecord | null>

  findManyByUserId(userId: string): Promise<SearchRecord[]>

  findSuggestions(query: string, limit: number): Promise<StockSuggestion[]>

  update(
    userId: string,
    searchId: string,
    data: StockSearchUpdateData
  ): Promise<boolean>

  deleteById(userId: string, searchId: string): Promise<boolean>
}
