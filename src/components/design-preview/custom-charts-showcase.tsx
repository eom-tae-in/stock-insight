'use client'
import { addWeeks, format } from 'date-fns'
import { CustomChartBuilder } from '@/components/stock/custom-chart-builder'
import { CustomChartView } from '@/components/stock/custom-chart-view'
import { calculateMetrics, calculateMA13 } from '@/lib/calculations'

const points = Array.from({ length: 78 }, (_, index) => ({
  date: format(addWeeks(new Date(2025, 3, 7), index), 'yyyy-MM-dd'),
  close: Math.round((85 + index * 1.3 + Math.sin(index / 4) * 6) * 100) / 100,
}))

export function CustomChartsShowcase() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold">NVDA 커스텀 차트</h1>
        <p className="text-text-secondary mt-2 text-[13px]">
          개발 전용 고정 데이터 · 생성과 삭제는 이 브라우저에서만 확인해요.
        </p>
      </header>
      <CustomChartBuilder
        searchId="ui-custom-chart"
        ticker="NVDA"
        priceData={points}
      />
      <CustomChartView
        searchId="ui-custom-chart"
        ticker="NVDA"
        currency="USD"
        priceData={points}
        metrics={calculateMetrics(points)}
        ma13={calculateMA13(points)}
      />
    </main>
  )
}
