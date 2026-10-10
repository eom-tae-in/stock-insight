'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UnifiedChart } from '@/components/stock/unified-chart'
import { calculateMA13, calculateMetrics } from '@/lib/calculations'
import { StockDetailSummary } from '@/components/stock/stock-detail-summary'
import type { SearchRecord } from '@/types'

const record: SearchRecord = {
  id: 'preview-detail',
  user_id: 'design-preview',
  ticker: 'NVDA',
  company_name: 'NVIDIA Corporation',
  currency: 'USD',
  searched_at: '2026-10-02T00:00:00Z',
  price_data: Array.from({ length: 80 }, (_, week) => ({
    date: new Date(Date.UTC(2025, 2, 24 + week * 7)).toISOString().slice(0, 10),
    close: 90 + week * 1.2,
    high: 100 + week * 1.2,
    low: 85 + week * 1.2,
    volume: 1000000000 + week * 1000000,
  })),
}
export function StockDetailShowcase() {
  const [short, setShort] = useState(false)
  const [declining, setDeclining] = useState(false)
  const displayRecord = declining
    ? {
        ...record,
        price_data: record.price_data.map((point, index) => ({
          ...point,
          close: 200 - index,
          high: 210 - index,
          low: 195 - index,
        })),
      }
    : record
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <StockDetailSummary
        record={
          short
            ? {
                ...displayRecord,
                price_data: displayRecord.price_data
                  .slice(-1)
                  .map(({ date, close }) => ({ date, close })),
              }
            : displayRecord
        }
      />
      <section className="mt-6">
        <UnifiedChart
          ticker={record.ticker}
          currency={record.currency}
          priceData={displayRecord.price_data}
          ma13={calculateMA13(displayRecord.price_data)}
          metrics={calculateMetrics(displayRecord.price_data)}
        />
      </section>
      <Button
        variant="secondary"
        className="mt-6"
        onClick={() => setShort(value => !value)}
      >
        {short ? '전체 데이터 보기' : '부족한 데이터 보기'}
      </Button>
      <Button
        variant="secondary"
        className="mt-6 ml-2"
        onClick={() => setDeclining(value => !value)}
      >
        {declining ? '상승 데이터 보기' : '하락 데이터 보기'}
      </Button>
      <p className="text-tertiary mt-4 text-xs">
        개발 전용 고정 데이터 · 실제 저장 데이터가 아니에요.
      </p>
    </main>
  )
}
