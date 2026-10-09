import type { KeywordRecord } from '@/types/database'
import {
  interestMetrics,
  interestSignal,
  selectRepresentativeAnalysis,
  sortAnalyses,
} from './analysis'
import { overlayDeviation } from './stock'

export function keywordInsight(keyword: KeywordRecord) {
  const analysis = selectRepresentativeAnalysis(keyword.analyses ?? [])
  const metrics = interestMetrics(analysis?.trends_data ?? [])
  const below = (analysis?.overlays ?? [])
    .flatMap(overlay => {
      const deviation = overlayDeviation(overlay)
      return deviation !== null && deviation < 0
        ? [{ ticker: overlay.ticker, deviation }]
        : []
    })
    .toSorted(
      (a, b) => a.deviation - b.deviation || a.ticker.localeCompare(b.ticker)
    )
  const signal = interestSignal(metrics.yoy)
  return {
    id: keyword.id,
    keyword: keyword.keyword,
    analysisId: analysis?.id ?? null,
    region: analysis?.region ?? keyword.region,
    searchType: analysis?.search_type ?? keyword.search_type,
    updatedAt: analysis?.updated_at ?? analysis?.created_at ?? null,
    ...metrics,
    signal,
    kind:
      signal === 'surge' && below.length > 0 ? ('divergence' as const) : signal,
    below,
    tickerLabel: below[0]
      ? `${below[0].ticker}${below.length > 1 ? ` 외 ${below.length - 1}` : ''}`
      : null,
    analysisCount: keyword.analyses?.length ?? 0,
    overlayCount: new Set(
      (keyword.analyses ?? []).flatMap(item =>
        (item.overlays ?? []).map(overlay => overlay.ticker.toUpperCase())
      )
    ).size,
  }
}

export function linkedKeywords(
  ticker: string,
  keywords: readonly KeywordRecord[]
) {
  return keywords
    .flatMap(keyword => {
      const analysis = sortAnalyses(keyword.analyses ?? []).find(item =>
        item.overlays?.some(
          overlay => overlay.ticker.toUpperCase() === ticker.toUpperCase()
        )
      )
      return analysis
        ? [
            {
              id: keyword.id,
              keyword: keyword.keyword,
              analysisId: analysis.id,
              ...interestMetrics(analysis.trends_data ?? []),
            },
          ]
        : []
    })
    .toSorted(
      (a, b) =>
        Math.abs(b.yoy ?? 0) - Math.abs(a.yoy ?? 0) || a.id.localeCompare(b.id)
    )
}
