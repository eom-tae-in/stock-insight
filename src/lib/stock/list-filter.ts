import type { SearchRecord } from '@/types'
import { stockWeeklyChange } from './list-summary'

export type StockChangeFilter = 'all' | 'up' | 'down'

export function stockFilterSummary(
  records: readonly SearchRecord[],
  query: string
) {
  const normalized = query.trim().toLowerCase()
  const matches = records.filter(record =>
    `${record.ticker} ${record.company_name}`.toLowerCase().includes(normalized)
  )
  const up = matches.filter(record => (stockWeeklyChange(record) ?? 0) > 0)
  const down = matches.filter(record => (stockWeeklyChange(record) ?? 0) < 0)
  return { all: matches, up, down }
}

export function parseStockFilter(value: string): StockChangeFilter {
  switch (value) {
    case 'up':
      return 'up'
    case 'down':
      return 'down'
    default:
      return 'all'
  }
}
