import type { PriceDataPoint, KeywordAnalysisOverlay } from '@/types/database'
import { calculateMetrics } from '@/lib/calculations'

export function percentageChange(
  current: number | undefined,
  previous: number | undefined
) {
  if (
    current === undefined ||
    previous === undefined ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous <= 0
  )
    return null
  return ((current - previous) / previous) * 100
}

export function stockDisplayMetrics(points: readonly PriceDataPoint[]) {
  const latest = points.at(-1)
  const metrics = calculateMetrics([...points])
  return {
    current: latest?.close ?? null,
    change: percentageChange(latest?.close, points.at(-2)?.close),
    ma13: points.length >= 13 ? metrics.ma13 : null,
    deviation:
      points.length >= 13
        ? percentageChange(latest?.close, metrics.ma13)
        : null,
    yoy: points.length >= 65 ? metrics.yoyChange : null,
    highestClose: points.length
      ? Math.max(...points.map(point => point.close))
      : null,
    high: latest?.high ?? null,
    low: latest?.low ?? null,
    range:
      latest?.high !== undefined && latest.low !== undefined
        ? latest.high - latest.low
        : null,
    volume: latest?.volume ?? null,
    sparkline: points.slice(-52).map(point => point.close),
  }
}

export function overlayDeviation(overlay: KeywordAnalysisOverlay) {
  const prices = (overlay.chart_data ?? []).flatMap(point =>
    point.rawPrice !== null && Number.isFinite(point.rawPrice)
      ? [point.rawPrice]
      : []
  )
  if (prices.length < 13) return null
  const average = prices.slice(-13).reduce((sum, price) => sum + price, 0) / 13
  return percentageChange(prices.at(-1), average)
}
