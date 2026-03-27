'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CustomChart, CustomChartBuilderProps } from '@/types'

const AVAILABLE_SERIES = [
  { key: 'close', label: '종가', color: '#3b82f6', minWeeks: 0 },
  { key: 'ma13', label: '13주 MA', color: '#f97316', minWeeks: 13 },
  { key: 'week52High', label: '52주 최고가', color: '#22c55e', minWeeks: 52 },
  { key: 'week52Low', label: '52주 최저가', color: '#ef4444', minWeeks: 52 },
  { key: 'trends', label: '검색 관심도', color: '#a78bfa', minWeeks: 0 },
  { key: 'yoy', label: '52주 YoY', color: '#f59e0b', minWeeks: 52 },
]

const TIME_RANGES = [
  { weeks: 13, label: '13주' },
  { weeks: 26, label: '26주' },
  { weeks: 52, label: '52주' },
  { weeks: 104, label: '104주' },
  { weeks: 260, label: '260주' },
]

export function CustomChartBuilder({
  searchId,
  onChartCreated,
}: CustomChartBuilderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [chartName, setChartName] = useState('')
  const [selectedSeries, setSelectedSeries] = useState<string[]>([
    'close',
    'trends',
  ])
  const [timeRange, setTimeRange] = useState(52)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 선택된 시리즈의 최소 주 수
  const minRequiredWeeks = Math.max(
    0,
    ...selectedSeries.map(key => {
      const series = AVAILABLE_SERIES.find(s => s.key === key)
      return series?.minWeeks || 0
    })
  )

  const toggleSeries = (seriesKey: string) => {
    setSelectedSeries(prev => {
      const newSeries = prev.includes(seriesKey)
        ? prev.filter(s => s !== seriesKey)
        : [...prev, seriesKey]

      const minWeeks = Math.max(
        0,
        ...newSeries.map(key => {
          const series = AVAILABLE_SERIES.find(s => s.key === key)
          return series?.minWeeks || 0
        })
      )

      if (timeRange < minWeeks) {
        setTimeRange(minWeeks)
      }

      return newSeries
    })
  }

  const handleSave = async () => {
    if (!chartName.trim()) {
      alert('차트 이름을 입력해주세요')
      return
    }

    if (selectedSeries.length === 0) {
      alert('최소 1개 이상의 시리즈를 선택해주세요')
      return
    }

    setIsSubmitting(true)

    try {
      const storageKey = `stock-custom-charts-${searchId}`
      const existingData = localStorage.getItem(storageKey)
      const charts: CustomChart[] = existingData ? JSON.parse(existingData) : []

      const newChart: CustomChart = {
        id: crypto.randomUUID(),
        name: chartName.trim(),
        series: selectedSeries,
        timeRange,
        createdAt: new Date().toISOString(),
      }

      charts.push(newChart)
      localStorage.setItem(storageKey, JSON.stringify(charts))

      onChartCreated?.(newChart)

      window.dispatchEvent(
        new CustomEvent('customChartUpdated', {
          detail: { searchId, newChart },
        })
      )

      setChartName('')
      setSelectedSeries(['close', 'trends'])
      setIsOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        커스텀 차트 만들기
      </Button>

      <DialogContent className="max-w-2xl rounded-3xl border-2 border-blue-500/20 bg-gradient-to-br from-blue-50/50 to-white p-0 dark:from-blue-950/20 dark:to-slate-950">
        {/* 헤더 */}
        <div className="border-b border-blue-200/30 px-8 py-8 dark:border-blue-900/30">
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-muted absolute top-8 right-8 rounded-full p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <DialogHeader className="text-left">
            <DialogTitle className="text-3xl font-bold">
              새 커스텀 차트 만들기
            </DialogTitle>
            <DialogDescription className="mt-2 text-base">
              원하는 시리즈를 선택하여 독립적인 분석 차트를 생성하세요
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* 콘텐츠 */}
        <div className="space-y-8 px-8 py-8">
          {/* 차트 이름 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <Label className="text-lg font-semibold">차트 이름</Label>
            </div>
            <Input
              placeholder="예: 최근 3개월 가격 추이"
              value={chartName}
              onChange={e => setChartName(e.target.value)}
              disabled={isSubmitting}
              className="h-11 border-blue-200/50 bg-white/80 text-base dark:border-blue-900/50 dark:bg-slate-900/50"
            />
            <p className="text-muted-foreground text-sm">
              이 차트를 구분하기 위한 이름을 입력하세요
            </p>
          </div>

          {/* 시간 범위 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <Label className="text-lg font-semibold">시간 범위</Label>
            </div>

            {/* 프리셋 버튼들 */}
            <div className="grid grid-cols-5 gap-2">
              {TIME_RANGES.map(preset => (
                <button
                  key={preset.weeks}
                  onClick={() => setTimeRange(preset.weeks)}
                  disabled={isSubmitting}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    timeRange === preset.weeks
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : 'border border-blue-200/50 bg-white/60 text-slate-700 hover:bg-blue-50/80 dark:border-blue-900/50 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-blue-950/30'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* 커스텀 입력 */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="260"
                    value={timeRange}
                    onChange={e => {
                      const weeks = parseInt(e.target.value) || 1
                      setTimeRange(Math.min(Math.max(1, weeks), 260))
                    }}
                    disabled={isSubmitting}
                    className="h-11 border-blue-200/50 bg-white/80 dark:border-blue-900/50 dark:bg-slate-900/50"
                  />
                  <span className="text-sm font-medium whitespace-nowrap text-slate-600 dark:text-slate-300">
                    주
                  </span>
                </div>
              </div>
            </div>

            {timeRange < minRequiredWeeks && minRequiredWeeks > 0 && (
              <div className="rounded-lg bg-red-50/80 p-3 dark:bg-red-950/30">
                <p className="text-sm text-red-700 dark:text-red-400">
                  ⚠️ 선택한 시리즈는 {minRequiredWeeks}주 이상 필요합니다
                </p>
              </div>
            )}
          </div>

          {/* 시리즈 선택 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <Label className="text-lg font-semibold">포함할 시리즈</Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_SERIES.map(series => (
                <button
                  key={series.key}
                  onClick={() => toggleSeries(series.key)}
                  disabled={isSubmitting}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all duration-200 ${
                    selectedSeries.includes(series.key)
                      ? 'border-blue-400 bg-blue-50/80 dark:border-blue-600 dark:bg-blue-950/30'
                      : 'border-slate-200/60 bg-white/60 hover:border-blue-300/60 dark:border-slate-700/60 dark:bg-slate-800/40'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-md transition-all ${
                      selectedSeries.includes(series.key)
                        ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950'
                        : ''
                    }`}
                    style={{
                      backgroundColor: selectedSeries.includes(series.key)
                        ? series.color
                        : 'transparent',
                      border: `2px solid ${series.color}`,
                    }}
                  />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {series.label}
                    </p>
                    {series.minWeeks > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        최소 {series.minWeeks}주
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 미리보기 */}
          {selectedSeries.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                선택된 시리즈
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedSeries.map(key => {
                  const series = AVAILABLE_SERIES.find(s => s.key === key)
                  return (
                    <div
                      key={key}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-white shadow-md"
                      style={{
                        backgroundColor: series?.color,
                      }}
                    >
                      <div className="h-2 w-2 rounded-full bg-white/80" />
                      {series?.label}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex gap-3 border-t border-blue-200/30 px-8 py-6 dark:border-blue-900/30">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="h-11 flex-1"
          >
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isSubmitting ||
              !chartName.trim() ||
              selectedSeries.length === 0 ||
              timeRange < minRequiredWeeks
            }
            className="h-11 flex-1 bg-blue-500 font-medium text-white hover:bg-blue-600"
          >
            {isSubmitting ? '생성 중...' : '차트 생성'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
