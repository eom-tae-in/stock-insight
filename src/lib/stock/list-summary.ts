import type { KeywordRecord, SearchRecord } from '@/types'
import { interestMetrics, sortAnalyses } from '@/lib/insights/analysis'
import { stockDisplayMetrics, percentageChange } from '@/lib/insights/stock'

export type LinkedInterest = {
  readonly keywordId: string
  readonly keyword: string
  readonly value: number | null
  readonly yoy: number | null
  readonly count: number
}

export function linkedStockInterests(keywords: readonly KeywordRecord[]) {
  const result: Record<string, LinkedInterest> = {}
  for (const keyword of keywords) {
    const analyses = keyword.analyses
      ? sortAnalyses(keyword.analyses)
      : [{ overlays: keyword.overlays, trends_data: keyword.trends_data }]
    const seen = new Set<string>()
    for (const analysis of analyses) {
      for (const overlay of analysis.overlays ?? []) {
        const ticker = overlay.ticker.toUpperCase()
        if (seen.has(ticker)) continue
        seen.add(ticker)
        const existing = result[ticker]
        if (existing) {
          result[ticker] = { ...existing, count: existing.count + 1 }
        } else {
          const metrics = interestMetrics(analysis.trends_data ?? [])
          result[ticker] = {
            keywordId: keyword.id,
            keyword: keyword.keyword,
            value: metrics.value,
            yoy: metrics.yoy,
            count: 1,
          }
        }
      }
    }
  }
  return result
}

export function stockListMetrics(record: SearchRecord) {
  const metrics = stockDisplayMetrics(record.price_data)
  const current = record.current_price ?? metrics.current
  return {
    ...metrics,
    current,
    change: percentageChange(
      current ?? undefined,
      record.previous_close ?? record.price_data.at(-2)?.close
    ),
  }
}
