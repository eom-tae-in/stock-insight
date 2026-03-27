'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
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
  { weeks: 13, label: '13주 (3개월)' },
  { weeks: 26, label: '26주 (6개월)' },
  { weeks: 52, label: '52주 (1년)' },
  { weeks: 104, label: '104주 (2년)' },
  { weeks: 260, label: '260주 (5년)' },
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
  const [timeRange, setTimeRange] = useState(52) // 기본값: 52주 (1년)
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

      // 시리즈 선택에 따라 timeRange 자동 조정
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
      // localStorage에서 기존 차트 목록 조회
      const storageKey = `stock-custom-charts-${searchId}`
      const existingData = localStorage.getItem(storageKey)
      const charts: CustomChart[] = existingData ? JSON.parse(existingData) : []

      // 새 차트 추가
      const newChart: CustomChart = {
        id: crypto.randomUUID(),
        name: chartName.trim(),
        series: selectedSeries,
        timeRange,
        createdAt: new Date().toISOString(),
      }

      charts.push(newChart)
      localStorage.setItem(storageKey, JSON.stringify(charts))

      // 콜백 호출
      onChartCreated?.(newChart)

      // CustomChartView에 업데이트 알림
      window.dispatchEvent(
        new CustomEvent('customChartUpdated', {
          detail: { searchId, newChart },
        })
      )

      // UI 리셋
      setChartName('')
      setSelectedSeries(['close', 'trends'])
      setIsOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          커스텀 차트 만들기
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>새 커스텀 차트</SheetTitle>
          <SheetDescription>
            원하는 시리즈를 선택하여 독립적인 분석 차트를 만드세요
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* 차트 이름 입력 */}
          <div className="space-y-2">
            <Label htmlFor="chart-name">차트 이름 *</Label>
            <Input
              id="chart-name"
              placeholder="예: 최근 3개월 가격 추이"
              value={chartName}
              onChange={e => setChartName(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-muted-foreground text-xs">
              이 차트를 구분하기 위한 이름을 입력하세요
            </p>
          </div>

          {/* 시간 범위 입력 */}
          <div className="space-y-3">
            <Label htmlFor="time-range" className="text-base font-semibold">
              시간 범위 (주 단위) *
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="time-range"
                type="number"
                min="1"
                max="260"
                value={timeRange}
                onChange={e =>
                  setTimeRange(Math.max(1, parseInt(e.target.value) || 1))
                }
                disabled={isSubmitting}
                className="flex-1"
                placeholder="예: 52"
              />
              <span className="text-muted-foreground text-sm font-medium">
                주
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              1~260주 범위에서 자유롭게 입력하세요
            </p>
            {timeRange < minRequiredWeeks && minRequiredWeeks > 0 && (
              <p className="text-xs text-red-600 dark:text-red-500">
                ⚠️ {minRequiredWeeks}주 이상이 필요합니다 (현재: {timeRange}주)
              </p>
            )}
          </div>

          {/* 시리즈 선택 */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-semibold">
                포함할 시리즈 선택 *
              </Label>
              <p className="text-muted-foreground text-xs">
                2개 이상의 시리즈를 선택하면 더 효과적입니다
              </p>
            </div>

            <div className="space-y-3">
              {AVAILABLE_SERIES.map(series => (
                <div key={series.key} className="flex items-center gap-3">
                  <Checkbox
                    id={`series-${series.key}`}
                    checked={selectedSeries.includes(series.key)}
                    onCheckedChange={() => toggleSeries(series.key)}
                    disabled={isSubmitting}
                  />
                  <div className="flex flex-1 items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: series.color }}
                    />
                    <Label
                      htmlFor={`series-${series.key}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {series.label}
                      {series.minWeeks > 0 && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          (최소 {series.minWeeks}주)
                        </span>
                      )}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 미리보기 */}
          {selectedSeries.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground mb-2 text-xs">미리보기:</p>
              <div className="flex flex-wrap gap-2">
                {selectedSeries.map(key => {
                  const series = AVAILABLE_SERIES.find(s => s.key === key)
                  return (
                    <div
                      key={key}
                      className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: series?.color,
                        color: 'white',
                      }}
                    >
                      <div className="h-2 w-2 rounded-full bg-white" />
                      {series?.label}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="flex-1"
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
              className="flex-1"
            >
              {isSubmitting ? '생성 중...' : '생성'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
