import type { KeywordAnalysisSummary, TrendsDataPoint } from '@/types/database'
import { calculateTrendsYoY } from '@/lib/indicators'

const timestamp = (value: string | undefined) =>
  value ? Date.parse(value) || 0 : 0

export function sortAnalyses(analyses: readonly KeywordAnalysisSummary[]) {
  return analyses
    .filter(item => item.period === '5Y')
    .toSorted(
      (a, b) =>
        (a.display_order ?? 0) - (b.display_order ?? 0) ||
        timestamp(b.updated_at) - timestamp(a.updated_at) ||
        timestamp(b.created_at) - timestamp(a.created_at) ||
        a.id.localeCompare(b.id)
    )
}

export function selectRepresentativeAnalysis(
  analyses: readonly KeywordAnalysisSummary[]
) {
  return sortAnalyses(analyses)[0] ?? null
}

export function interestMetrics(points: readonly TrendsDataPoint[]) {
  const latest = points.at(-1)
  const previous = points.at(-2)
  const yoy =
    points.length < 65
      ? null
      : (latest?.yoyValue ?? calculateTrendsYoY([...points]))
  return {
    value: latest?.value ?? null,
    change: latest && previous ? latest.value - previous.value : null,
    yoy: yoy !== null && Number.isFinite(yoy) ? yoy : null,
    sparkline: points.slice(-52).map(point => point.value),
  }
}

export type InterestSignal = 'surge' | 'slowdown' | 'neutral'

export function interestSignal(yoy: number | null): InterestSignal {
  if (yoy === null) return 'neutral'
  if (yoy >= 20) return 'surge'
  if (yoy <= -15) return 'slowdown'
  return 'neutral'
}
