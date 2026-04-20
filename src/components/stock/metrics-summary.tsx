'use client'

import { MetricsCard } from '@/components/stock/metrics-card'
import { getCurrencyFromTicker } from '@/lib/utils/currency'
import type { MetricsSummaryProps } from '@/types/ui'

export function MetricsSummary({
  metrics,
  lastUpdatedAt,
  ticker,
  currency,
}: MetricsSummaryProps & { ticker: string; currency?: string }) {
  const isYoYPositive = metrics.yoyChange >= 0
  // currency가 있으면 사용, 없으면 ticker에서 파싱 (fallback)
  const currencyInfo = getCurrencyFromTicker(currency || ticker)

  // 통화별 가격 포맷팅 (한국₩: 정수, 미국$: 소수점2자리)
  const formatPrice = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals,
    })
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}.${month}.${day}`
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricsCard
          label="지난주 종가"
          value={formatPrice(metrics.currentPrice)}
          unit={currencyInfo.symbol}
        />
        <MetricsCard
          label="최근 13주 평균 (MA13)"
          value={formatPrice(metrics.ma13)}
          unit={currencyInfo.symbol}
        />
        <MetricsCard
          label="1년 전 대비 수익률 (52주 YoY)"
          value={metrics.yoyChange}
          unit="%"
          isPositive={isYoYPositive}
        />
      </div>

      {/* 기준점 설명 */}
      {lastUpdatedAt && (
        <div className="text-muted-foreground bg-muted/30 rounded-lg px-4 py-2.5 text-xs">
          <p className="leading-relaxed">
            💡 <strong>기준점:</strong> {formatDate(lastUpdatedAt)} (전주 기준)
            · <strong>최근 13주 평균:</strong> 최근 13주의 평균 종가 ·{' '}
            <strong>52주 YoY:</strong> 1년 전 대비 변화율
          </p>
        </div>
      )}
    </div>
  )
}
