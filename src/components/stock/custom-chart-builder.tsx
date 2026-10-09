'use client'
import { useState, useSyncExternalStore } from 'react'
import { Plus, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Sparkline } from '@/components/shared/sparkline'
import { CustomChartFields } from './custom-chart-fields'
import {
  CUSTOM_CHART_SERIES,
  chartSeriesLabel,
  readCustomCharts,
} from '@/lib/custom-charts'
import type {
  CustomChart,
  CustomChartBuilderProps,
  PriceDataPoint,
} from '@/types'

const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

export function CustomChartBuilder({
  searchId,
  onChartCreated,
  ticker,
  priceData = [],
}: CustomChartBuilderProps & {
  readonly ticker?: string
  readonly priceData?: readonly PriceDataPoint[]
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [series, setSeries] = useState<string[]>(['close'])
  const [weeks, setWeeks] = useState(52)
  const [removed, setRemoved] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const hydrated = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot
  )
  const points = priceData.slice(-weeks)
  const first = points.at(0),
    last = points.at(-1)
  const range =
    first && last
      ? `${format(parseISO(first.date), 'yyyy.MM')} – ${format(parseISO(last.date), 'yyyy.MM')} · `
      : ''

  function changeWeeks(value: number) {
    const unavailable = series.filter(
      key =>
        (CUSTOM_CHART_SERIES.find(item => item.key === key)?.minWeeks ?? 0) >
        value
    )
    const unavailableKeys = new Set(unavailable)
    setRemoved(unavailable)
    setSeries(series.filter(key => !unavailableKeys.has(key)))
    setWeeks(value)
  }
  function toggle(key: string) {
    setSeries(previous =>
      previous.includes(key)
        ? previous.filter(item => item !== key)
        : [...previous, key]
    )
    setRemoved(previous => previous.filter(item => item !== key))
  }
  function save() {
    if (!name.trim() || series.length === 0 || busy) return
    setBusy(true)
    setError('')
    try {
      const chart: CustomChart = {
        id: crypto.randomUUID(),
        name: name.trim(),
        series,
        timeRange: weeks,
        createdAt: new Date().toISOString(),
      }
      const charts = readCustomCharts(searchId)
      localStorage.setItem(
        `stock-custom-charts-${searchId}`,
        JSON.stringify([...charts, chart])
      )
      onChartCreated?.(chart)
      window.dispatchEvent(
        new CustomEvent('customChartUpdated', {
          detail: { searchId, newChart: chart },
        })
      )
      setName('')
      setSeries(['close'])
      setRemoved([])
      setOpen(false)
    } catch (cause) {
      if (!(cause instanceof Error)) throw cause
      setError(
        '차트를 저장하지 못했어요. 브라우저 저장 공간과 기존 차트 데이터를 확인해 주세요.'
      )
    } finally {
      setBusy(false)
    }
  }
  const trigger = (
    <Button variant="secondary" disabled={!hydrated}>
      <Plus className="size-4" aria-hidden />
      커스텀 차트 만들기
    </Button>
  )
  if (!hydrated) return trigger
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="bg-card flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]"
      >
        <DialogHeader className="relative shrink-0 gap-1 px-6 pt-5 pb-4 text-left">
          <DialogTitle className="pr-10 text-xl leading-7">
            커스텀 차트 만들기
          </DialogTitle>
          <DialogDescription className="pr-8 text-[13px] leading-5">
            {ticker ? `${ticker} · ` : ''}원하는 기간과 시리즈를 골라 이 종목에
            저장해요
          </DialogDescription>
          <DialogClose asChild>
            <Button
              variant="ghost"
              aria-label="닫기"
              className="absolute top-4 right-4 size-11 p-0"
            >
              <X className="size-[18px]" />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="min-h-0 space-y-5 overflow-y-auto px-6 pt-1 pb-5">
          <CustomChartFields
            name={name}
            onNameChange={setName}
            weeks={weeks}
            onWeeksChange={changeWeeks}
            series={series}
            onSeriesChange={toggle}
            removed={removed}
            error={error}
            busy={busy}
          />
          <div className="bg-surface-sunken space-y-2 rounded-md px-3.5 py-3">
            <div className="flex flex-wrap justify-between gap-2 text-xs">
              <span className="text-text-secondary">미리보기</span>
              <span className="text-tertiary tabular-nums">
                {range}
                {weeks}주 ·{' '}
                {chartSeriesLabel(series) || '시리즈를 선택해 주세요'}
              </span>
            </div>
            <Sparkline
              values={points.map(point => point.close)}
              size="card"
              label="선택 기간의 종가 추이"
            />
          </div>
        </div>
        <div className="border-border-subtle flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-6 py-4">
          <p className="text-tertiary basis-full text-xs leading-4 sm:min-w-0 sm:flex-1 sm:basis-auto">
            이 기기(브라우저)에 저장되고 아래 “커스텀 차트”에 추가돼요
          </p>
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            취소
          </Button>
          <Button
            onClick={save}
            disabled={busy || !name.trim() || series.length === 0}
          >
            {busy ? '저장 중…' : '차트 만들기'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
