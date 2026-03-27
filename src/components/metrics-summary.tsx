'use client'

import { MetricsCard } from '@/components/metrics-card'
import type { MetricsSummaryProps } from '@/types/ui'

export function MetricsSummary({ metrics }: MetricsSummaryProps) {
  const isYoYPositive = metrics.yoyChange >= 0

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <MetricsCard label="현재 종가" value={metrics.currentPrice} unit="$" />
      <MetricsCard label="13주 이동평균" value={metrics.ma13} unit="$" />
      <MetricsCard
        label="52주 YoY"
        value={metrics.yoyChange}
        unit="%"
        isPositive={isYoYPositive}
      />
      <MetricsCard label="52주 최고가" value={metrics.week52High} unit="$" />
      <MetricsCard label="52주 최저가" value={metrics.week52Low} unit="$" />
    </div>
  )
}
