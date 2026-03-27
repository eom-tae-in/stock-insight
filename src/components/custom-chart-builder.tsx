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
  { weeks: 52, label: '1년' },
  { weeks: 104, label: '2년' },
  { weeks: 156, label: '3년' },
  { weeks: 208, label: '4년' },
  { weeks: 260, label: '5년' },
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

      <DialogContent className="m-2 max-w-6xl rounded-2xl border-0 bg-white p-0 shadow-2xl sm:m-4 dark:bg-slate-950">
        {/* 닫기 버튼 */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-5 right-5 rounded-full p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        {/* 헤더 */}
        <div className="border-b border-slate-200 px-8 py-5 dark:border-slate-700">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-bold">
              커스텀 차트 생성
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm">
              원하는 데이터를 선택하여 나만의 분석 차트를 만들어보세요
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* 콘텐츠 */}
        <div className="space-y-5 px-8 py-6">
          {/* 차트 이름 */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              차트 이름
            </Label>
            <Input
              placeholder="예: 최근 1년 가격 추이"
              value={chartName}
              onChange={e => setChartName(e.target.value)}
              disabled={isSubmitting}
              className="h-10 border-slate-200 bg-slate-50/50 text-sm placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900/30 dark:placeholder:text-slate-500"
            />
          </div>

          {/* 시간 범위 & 시리즈 선택 */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            {/* 시간 범위 */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                시간 범위
              </Label>

              {/* 프리셋 버튼들 */}
              <div className="grid grid-cols-5 gap-2">
                {TIME_RANGES.map(preset => (
                  <button
                    key={preset.weeks}
                    onClick={() => setTimeRange(preset.weeks)}
                    disabled={isSubmitting}
                    className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all duration-200 ${
                      timeRange === preset.weeks
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'border-2 border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:border-blue-600 dark:hover:bg-blue-950/30'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* 커스텀 입력 */}
              <div className="space-y-2">
                <Label
                  htmlFor="custom-weeks"
                  className="text-xs font-medium text-slate-500 dark:text-slate-400"
                >
                  커스텀 입력
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="custom-weeks"
                    type="number"
                    min="1"
                    max="260"
                    value={timeRange}
                    onChange={e => {
                      const weeks = parseInt(e.target.value) || 1
                      setTimeRange(Math.min(Math.max(1, weeks), 260))
                    }}
                    disabled={isSubmitting}
                    className="h-10 border-slate-200 bg-slate-50/50 text-sm dark:border-slate-700 dark:bg-slate-900/30"
                  />
                  <span className="text-sm font-semibold whitespace-nowrap text-slate-600 dark:text-slate-300">
                    주
                  </span>
                </div>
              </div>

              {timeRange < minRequiredWeeks && minRequiredWeeks > 0 && (
                <div className="rounded-lg bg-amber-50/80 p-2 dark:bg-amber-950/30">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    ⚠️ {minRequiredWeeks}주 이상 필요
                  </p>
                </div>
              )}
            </div>

            {/* 시리즈 선택 */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                포함할 시리즈
              </Label>

              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_SERIES.map(series => (
                  <button
                    key={series.key}
                    onClick={() => toggleSeries(series.key)}
                    disabled={isSubmitting}
                    className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all duration-200 ${
                      selectedSeries.includes(series.key)
                        ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:border-blue-700 dark:from-blue-950/50 dark:to-blue-950/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:border-slate-600'
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
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
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
          </div>

          {/* 선택된 데이터 미리보기 */}
          {selectedSeries.length > 0 && (
            <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
              <Label className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                선택된 데이터
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedSeries.map(key => {
                  const series = AVAILABLE_SERIES.find(s => s.key === key)
                  return (
                    <div
                      key={key}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-md"
                      style={{
                        backgroundColor: series?.color,
                      }}
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-white/80" />
                      {series?.label}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex gap-3 border-t border-slate-200 px-8 py-4 dark:border-slate-700">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="h-10 flex-1 text-sm font-semibold"
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
            className="h-10 flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-sm font-bold text-white hover:from-blue-600 hover:to-blue-700"
          >
            {isSubmitting ? '생성 중...' : '차트 생성'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
