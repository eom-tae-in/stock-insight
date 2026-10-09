import type { KeywordRecord, SearchRecord } from '@/types/database'
import { keywordInsight } from './keywords'
import { stockDisplayMetrics } from './stock'
import { completedWeek, isStale } from './calendar'

const priority = { divergence: 0, surge: 1, slowdown: 2, neutral: 3 } as const

export function createBriefing(data: {
  readonly stocks: readonly SearchRecord[]
  readonly keywords: readonly KeywordRecord[]
  readonly now: Date
}) {
  const insights = data.keywords
    .map(keywordInsight)
    .toSorted(
      (a, b) =>
        priority[a.kind] - priority[b.kind] ||
        (a.kind === 'slowdown'
          ? (a.yoy ?? 0) - (b.yoy ?? 0)
          : (b.yoy ?? 0) - (a.yoy ?? 0)) ||
        a.id.localeCompare(b.id)
    )
  const changes = data.stocks.flatMap(stock => {
    const change = stockDisplayMetrics(stock.price_data).change
    return change === null ? [] : [change]
  })
  return {
    week: completedWeek(data.now),
    candidates: insights.filter(item => item.kind !== 'neutral').slice(0, 3),
    signals: insights.filter(item => item.kind !== 'neutral').slice(0, 5),
    statistics: {
      average: changes.length
        ? changes.reduce((sum, value) => sum + value, 0) / changes.length
        : null,
      up: changes.filter(value => value > 0).length,
      down: changes.filter(value => value < 0).length,
      surge: insights.filter(item => item.signal === 'surge').length,
    },
    staleStocks: data.stocks.filter(stock =>
      isStale(stock.last_updated_at ?? stock.searched_at, data.now)
    ).length,
    staleKeywords: insights.filter(item => isStale(item.updatedAt, data.now))
      .length,
    staleOverlays: data.keywords.reduce(
      (count, keyword) =>
        count +
        (keyword.analyses ?? []).reduce(
          (subtotal, analysis) =>
            subtotal +
            (analysis.overlays ?? []).filter(overlay =>
              isStale(overlay.last_refreshed_at, data.now)
            ).length,
          0
        ),
      0
    ),
  }
}
