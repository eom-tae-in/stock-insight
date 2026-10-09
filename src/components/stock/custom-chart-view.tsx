'use client'
import { useState, useEffect, useId } from 'react'
import { z } from 'zod'
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Sparkline } from '@/components/shared/sparkline'
import { UnifiedChart } from '@/components/stock/unified-chart'
import { readCustomCharts, chartSeriesLabel } from '@/lib/custom-charts'
import type {
  CustomChart,
  PriceDataPoint,
  TrendsDataPoint,
  Metrics,
} from '@/types'

type CustomChartViewProps = {
  readonly searchId: string
  readonly ticker: string
  readonly currency?: string
  readonly priceData: PriceDataPoint[]
  readonly trendsData?: TrendsDataPoint[]
  readonly ma13?: (number | null)[]
  readonly metrics: Metrics
}
const updateSchema = z.object({
  searchId: z.string(),
  newChart: z.object({ id: z.string() }).optional(),
})

export function CustomChartView({
  searchId,
  ticker,
  currency,
  priceData,
  trendsData,
  ma13,
  metrics,
}: CustomChartViewProps) {
  const [charts, setCharts] = useState<CustomChart[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [pending, setPending] = useState<CustomChart | null>(null)
  const [error, setError] = useState('')
  const prefix = useId()
  useEffect(() => {
    function load() {
      try {
        const saved = readCustomCharts(searchId)
        setCharts(saved)
        setExpanded(saved.at(0)?.id ?? null)
        setError('')
      } catch (cause) {
        if (!(cause instanceof Error)) throw cause
        setError(
          '저장된 커스텀 차트를 읽지 못했어요. 기존 데이터는 그대로 보관돼요.'
        )
      }
    }
    function updated(event: Event) {
      if (!(event instanceof CustomEvent)) return
      const parsed = updateSchema.safeParse(event.detail)
      if (!parsed.success || parsed.data.searchId !== searchId) return
      load()
      if (parsed.data.newChart) setExpanded(parsed.data.newChart.id)
    }
    load()
    window.addEventListener('customChartUpdated', updated)
    return () => window.removeEventListener('customChartUpdated', updated)
  }, [searchId])

  function remove() {
    if (!pending) return
    const next = charts.filter(chart => chart.id !== pending.id)
    try {
      localStorage.setItem(
        `stock-custom-charts-${searchId}`,
        JSON.stringify(next)
      )
      setCharts(next)
      if (expanded === pending.id) setExpanded(null)
      setPending(null)
      setError('')
    } catch (cause) {
      if (!(cause instanceof Error)) throw cause
      setError('차트를 삭제하지 못했어요. 브라우저 저장 공간을 확인해 주세요.')
    }
  }
  if (!charts.length && !error) return null
  return (
    <section
      className="bg-card overflow-hidden rounded-lg border"
      aria-label="커스텀 차트"
    >
      <div className="px-5 py-4">
        <h3 className="text-base font-semibold">
          커스텀 차트{' '}
          <span className="text-text-secondary ml-2 text-sm tabular-nums">
            {charts.length}
          </span>
        </h3>
        <p className="text-tertiary mt-1 text-xs leading-4">
          원하는 기간과 시리즈만 골라 만든 차트 · 이 기기(브라우저)에 저장돼요
        </p>
      </div>
      {error && (
        <p role="alert" className="text-danger px-5 pb-4 text-sm">
          {error}
        </p>
      )}
      {charts.map(chart => {
        const open = expanded === chart.id
        return (
          <div key={chart.id} className="border-border-subtle border-t">
            <div className="flex items-center gap-2 px-4">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`${prefix}-${chart.id}`}
                onClick={() => setExpanded(open ? null : chart.id)}
                className="hover:bg-surface-raised focus-visible:ring-ring flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-md py-3 text-left outline-none focus-visible:ring-2"
              >
                {open ? (
                  <ChevronDown
                    className="text-text-secondary size-4 shrink-0"
                    aria-hidden
                  />
                ) : (
                  <ChevronRight
                    className="text-text-secondary size-4 shrink-0"
                    aria-hidden
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {chart.name}
                  </span>
                  <span className="text-tertiary mt-1 block text-xs">
                    {chart.timeRange % 52 === 0
                      ? `${chart.timeRange / 52}년 (${chart.timeRange}주)`
                      : `${chart.timeRange}주`}{' '}
                    · {chartSeriesLabel(chart.series)}
                  </span>
                </span>
                <span className="hidden sm:block">
                  <Sparkline
                    values={priceData
                      .slice(-chart.timeRange)
                      .map(point => point.close)}
                    label={`${chart.name} 종가 추이`}
                  />
                </span>
              </button>
              <Button
                variant="ghost"
                aria-label={`${chart.name} 삭제`}
                className="text-danger size-11 shrink-0 p-0"
                onClick={() => setPending(chart)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div
              id={`${prefix}-${chart.id}`}
              hidden={!open}
              className="border-border-subtle border-t p-4"
            >
              {open && (
                <UnifiedChart
                  ticker={ticker}
                  currency={currency}
                  priceData={priceData}
                  trendsData={trendsData}
                  ma13={ma13}
                  metrics={metrics}
                  initialEnabledSeries={chart.series}
                  timeRange={chart.timeRange}
                />
              )}
            </div>
          </div>
        )
      })}
      <AlertDialog
        open={pending !== null}
        onOpenChange={open => {
          if (!open) setPending(null)
        }}
      >
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>커스텀 차트 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              ‘{pending?.name}’을 삭제할까요? 이 기기에서만 지워져요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={event => {
                event.preventDefault()
                remove()
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
