'use client'

import { DashboardClient } from '@/components/stock/dashboard-client'
import type { SearchRecord } from '@/types'

const records: SearchRecord[] = [
  ['AAPL', 'Apple Inc.'],
  ['MSFT', 'Microsoft Corporation'],
  ['NVDA', 'NVIDIA Corporation'],
].map(([ticker, company], index) => ({
  id: `preview-stock-${index}`,
  user_id: 'design-preview',
  ticker,
  company_name: company,
  currency: 'USD',
  weekly_open: 121.25,
  weekly_high: 129.48,
  weekly_low: 118.36,
  current_price: 126.73,
  previous_close: 121.98,
  ma13: 119.85,
  yoy_change: 13.42,
  price_data: [],
  trends_data: [],
  searched_at: '2026-10-02T00:00:00.000Z',
  last_updated_at: '2026-10-02T00:00:00.000Z',
}))

export function StockEditShowcase() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">관심 종목 편집</h1>
      <p className="text-text-secondary mb-6 text-sm">
        개발 전용 고정 데이터 · 삭제 요청은 브라우저 검증에서만 대체해요.
      </p>
      <DashboardClient initialRecords={records} />
    </main>
  )
}
