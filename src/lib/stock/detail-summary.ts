import type { PriceDataPoint } from '@/types/database'
import { percentageChange, stockDisplayMetrics } from '@/lib/insights/stock'

export function stockDetailSummary(points: readonly PriceDataPoint[]) {
  const metrics = stockDisplayMetrics(points)
  const latest = points.at(-1)
  const highest = points.reduce<PriceDataPoint | null>(
    (best, point) => (!best || point.close > best.close ? point : best),
    null
  )
  return {
    ...metrics,
    date: latest?.date ?? null,
    difference:
      latest && points.length > 1
        ? latest.close - points[points.length - 2].close
        : null,
    highestDate: highest?.date ?? null,
    highestChange: percentageChange(latest?.close, highest?.close),
    rangePercent: percentageChange(latest?.high, latest?.low),
    volumeChange: percentageChange(latest?.volume, points.at(-2)?.volume),
  }
}
