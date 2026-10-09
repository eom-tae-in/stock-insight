'use client'

import { DashboardClient } from '@/components/stock/dashboard-client'
import { completedWeek } from '@/lib/insights/calendar'
import type { SearchRecord } from '@/types'

const records: SearchRecord[] = ['AAPL', 'MSFT', 'NVDA'].map(
  (ticker, index) => ({
    id: `preview-stock-${index}`,
    user_id: 'design-preview',
    ticker,
    company_name:
      ['Apple Inc.', 'Microsoft Corporation', 'NVIDIA Corporation'][index] ??
      ticker,
    currency: 'USD',
    current_price: [126.73, 310.45, 187.62][index],
    previous_close: [121.98, 318.2, 183.31][index],
    price_data: Array.from({ length: 80 }, (_, week) => ({
      date: new Date(Date.UTC(2025, 2, 24 + week * 7))
        .toISOString()
        .slice(0, 10),
      close: 90 + index * 50 + week * 0.4 + Math.sin(week / 4) * 3,
    })),
    searched_at: '2026-10-02T00:00:00Z',
    last_updated_at: '2026-10-02T00:00:00Z',
  })
)
const week = completedWeek(new Date('2026-10-09T00:00:00+09:00'))
export function StockListShowcase() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl leading-8 font-bold">관심 종목</h1>
        <p className="text-text-secondary mt-2 text-sm">
          저장한 종목의 주간 변화와 연결 키워드를 비교해요.
        </p>
        <p className="text-tertiary mt-2 text-xs">
          {week.label} · {week.range} · 완료 주 기준
        </p>
      </header>
      <DashboardClient
        initialRecords={records}
        interests={{
          NVDA: {
            keywordId: 'preview-keyword',
            keyword: 'AI 반도체',
            value: 78,
            yoy: 48.2,
            count: 2,
          },
        }}
      />
      <p className="text-tertiary mt-6 text-xs leading-5">
        개발 전용 고정 데이터 · 실제 저장 데이터가 아니에요.
      </p>
    </main>
  )
}
