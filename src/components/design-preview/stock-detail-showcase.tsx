'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UnifiedChart } from '@/components/stock/unified-chart'
import { calculateMA13, calculateMetrics } from '@/lib/calculations'
import { StockDetailSummary } from '@/components/stock/stock-detail-summary'
import { StockWeeklyCard } from '@/components/stock/stock-weekly-card'
import { StockDetailRail } from '@/components/stock/stock-detail-rail'
import { StockDetailNavigation } from '@/components/stock/stock-detail-navigation'
import type { KeywordRecord } from '@/types/database'
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
const keywords: KeywordRecord[] = ['AI', '반도체', '클라우드'].map(
  (keyword, index) => ({
    id: `preview-keyword-${index}`,
    user_id: 'design-preview',
    keyword,
    region: 'GLOBAL',
    search_type: 'WEB',
    trends_data: [],
    searched_at: record.searched_at,
    created_at: record.searched_at,
    updated_at: record.searched_at,
    analyses: [
      {
        id: `preview-analysis-${index}`,
        keyword_id: `preview-keyword-${index}`,
        region: 'GLOBAL',
        search_type: 'WEB',
        period: '5Y',
        trends_data: Array.from({ length: 65 }, (_, week) => ({
          date: new Date(Date.UTC(2025, 6, 7 + week * 7))
            .toISOString()
            .slice(0, 10),
          value: 40 + week * 0.6 - index * 5,
          ma13Value: null,
          yoyValue: null,
        })),
        overlays:
          index < 2
            ? [
                {
                  id: `preview-overlay-${index}`,
                  analysis_id: `preview-analysis-${index}`,
                  created_at: record.searched_at,
                  ticker: 'NVDA',
                  company_name: 'NVIDIA',
                  display_order: 0,
                },
              ]
            : [],
      },
    ],
  })
)
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
  const summaryRecord = short
    ? {
        ...displayRecord,
        price_data: displayRecord.price_data
          .slice(-1)
          .map(({ date, close }) => ({ date, close })),
      }
    : displayRecord
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <StockDetailNavigation />
      <StockDetailSummary record={summaryRecord} />
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section
          id="stock-price-chart"
          tabIndex={-1}
          aria-label="가격 차트"
          className="min-w-0 scroll-mt-24"
        >
          <UnifiedChart
            ticker={record.ticker}
            currency={record.currency}
            priceData={displayRecord.price_data}
            ma13={calculateMA13(displayRecord.price_data)}
            metrics={calculateMetrics(displayRecord.price_data)}
          />
        </section>
        <StockDetailRail
          record={summaryRecord}
          keywords={short ? [] : keywords}
          cacheTtlSeconds={short ? null : 86400}
        />
      </div>
      <div id="stock-weekly-data" tabIndex={-1} className="mt-6 scroll-mt-24">
        <StockWeeklyCard record={summaryRecord} />
      </div>
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
