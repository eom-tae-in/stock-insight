import { z } from 'zod'

export const CUSTOM_CHART_SERIES = [
  { key: 'close', label: '종가', color: 'bg-chart-price', minWeeks: 0 },
  { key: 'ma13', label: '13주 MA', color: 'bg-chart-ma13', minWeeks: 13 },
  { key: 'yoy', label: '52주 YoY', color: 'bg-up', minWeeks: 65 },
] as const

export const customChartSchema = z.object({
  id: z.string(),
  name: z.string(),
  series: z.array(z.string()),
  timeRange: z.number().int().min(1).max(260),
  createdAt: z.string(),
})
export const customChartsSchema = z.array(customChartSchema)

export function readCustomCharts(searchId: string) {
  const value = localStorage.getItem(`stock-custom-charts-${searchId}`)
  if (!value) return []
  const parsed: unknown = JSON.parse(value)
  return customChartsSchema.parse(parsed)
}

export function chartSeriesLabel(series: readonly string[]) {
  return series
    .map(
      key => CUSTOM_CHART_SERIES.find(item => item.key === key)?.label ?? key
    )
    .join(' · ')
}
