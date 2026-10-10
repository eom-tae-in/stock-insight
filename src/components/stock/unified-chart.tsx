'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { calculateWeeklyYoY } from '@/lib/calculations'
import { type SeriesKey } from './stock-chart-config'
import { StockChartControls } from './stock-chart-controls'
import { captureChartAsPng } from '@/lib/export'
import { StockChartPlot } from './stock-chart-plot'
import type { UnifiedChartProps } from '@/types'

export function UnifiedChart({
  ticker,
  currency,
  priceData,
  ma13,
  onDownload,
  initialEnabledSeries,
  timeRange,
}: UnifiedChartProps & {
  initialEnabledSeries?: string[]
  timeRange?: number
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [isPngLoading, setIsPngLoading] = useState(false)
  const [enabledSeries, setEnabledSeries] = useState<
    Record<SeriesKey, boolean>
  >(
    initialEnabledSeries
      ? {
          open: initialEnabledSeries.includes('open'),
          close: initialEnabledSeries.includes('close'),
          low: initialEnabledSeries.includes('low'),
          high: initialEnabledSeries.includes('high'),
          ma13: initialEnabledSeries.includes('ma13'),
          yoy: initialEnabledSeries.includes('yoy'),
        }
      : {
          open: false,
          close: true,
          low: false,
          high: false,
          ma13: true,
          yoy: true,
        }
  )

  // 기간 선택 상태
  const [displayRange, setDisplayRange] = useState(timeRange || 260) // 기본값: 5년
  const [customRange, setCustomRange] = useState('')

  const disableAllSeries = () => {
    setEnabledSeries({
      open: false,
      close: true,
      low: false,
      high: false,
      ma13: false,
      yoy: false,
    })
  }

  const handleRangeChange = (weeks: number) => {
    setDisplayRange(weeks)
    setCustomRange(weeks.toString())
    disableAllSeries()

    // 진동 피드백
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }

  const handleCustomRange = (value: string) => {
    const weeks = Number(value)
    if (
      value === '' ||
      (Number.isInteger(weeks) && weeks > 0 && weeks <= 260)
    ) {
      setCustomRange(value)
      if (Number.isInteger(weeks) && weeks > 0 && weeks <= 260) {
        setDisplayRange(weeks)
        disableAllSeries()

        // 진동 피드백
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      }
    }
  }

  // 주별 13주 이동평균 기준 52주 YoY 계산
  const weeklyYoY = calculateWeeklyYoY(priceData)

  // 모든 데이터 병합
  const fullChartData = priceData.map((point, index) => ({
    date: point.date,
    open: point.open ?? null,
    close: point.close,
    low: point.low ?? null,
    high: point.high ?? null,
    ma13: ma13?.[index] ?? null,
    yoy: weeklyYoY[index] ?? null,
  }))

  // timeRange에 따라 초기 데이터 제한 (커스텀 차트의 경우)
  const timeRangeData = timeRange
    ? fullChartData.slice(Math.max(0, fullChartData.length - timeRange))
    : fullChartData

  // displayRange에 따라 차트 데이터 슬라이싱
  const chartData = timeRangeData.slice(
    Math.max(0, timeRangeData.length - displayRange)
  )

  const toggleSeries = (key: SeriesKey) => {
    setEnabledSeries(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleDownloadChart = async () => {
    if (!chartContainerRef.current || !ticker) {
      toast.error('차트를 찾을 수 없습니다.')
      return
    }

    try {
      setIsPngLoading(true)
      await captureChartAsPng(chartContainerRef.current, {
        ticker,
        chartName: 'unified-chart',
      })
      toast.success('차트가 PNG로 다운로드되었습니다.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '차트 다운로드에 실패했습니다.'
      toast.error(message)
    } finally {
      setIsPngLoading(false)
    }
  }

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <StockChartControls
        displayRange={displayRange}
        customRange={customRange}
        availableWeeks={chartData.length}
        startDate={chartData[0]?.date}
        endDate={chartData.at(-1)?.date}
        enabledSeries={enabledSeries}
        onRangeChange={handleRangeChange}
        onCustomChange={handleCustomRange}
        onToggle={toggleSeries}
        onDownload={onDownload ?? handleDownloadChart}
        downloading={isPngLoading}
      />

      {/* 차트 */}
      <div
        ref={chartContainerRef}
        className="p-4"
        style={{ overflow: 'hidden' }}
      >
        <StockChartPlot
          data={chartData}
          enabledSeries={enabledSeries}
          currency={currency || ticker || ''}
        />
      </div>
    </div>
  )
}
