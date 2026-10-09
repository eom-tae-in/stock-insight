'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { calculateWeeklyYoY } from '@/lib/calculations'
import { SERIES_CONFIG, type SeriesKey } from './stock-chart-config'
import { StockChartControls } from './stock-chart-controls'
import { captureChartAsPng } from '@/lib/export'
import { getCurrencySymbol, formatPrice } from '@/lib/utils/currency'
import { useChartTheme } from '@/hooks/use-chart-theme'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
} from 'recharts'
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
  const chartTheme = useChartTheme()
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

  // X축 레이블 간격 (매 12주마다 표시)
  const tickInterval = Math.max(1, Math.floor(chartData.length / 12))

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
        <ResponsiveContainer width="100%" height={500}>
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 120, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartTheme.gridColor}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              interval={tickInterval}
              angle={-45}
              textAnchor="end"
              height={80}
              stroke={chartTheme.axisColor}
            />

            {/* 좌측 Y축: 가격 (통화) */}
            {(enabledSeries.close || enabledSeries.ma13) && (
              <YAxis
                yAxisId="left"
                label={{
                  value: `가격 (${getCurrencySymbol(currency || ticker || '')})`,
                  angle: -90,
                  position: 'insideLeft',
                }}
                tick={{ fontSize: 12 }}
                stroke={chartTheme.axisColor}
              />
            )}

            {/* 우측 Y축: 13주 이동평균 기준 52주 YoY (%) */}
            {enabledSeries.yoy && chartData.length >= 65 && (
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{
                  value:
                    '13주 이동평균 기준 전년동기 대비 증감률(52주 YoY) (%)',
                  angle: 90,
                  position: 'insideRight',
                  offset: -10,
                }}
                tick={{ fontSize: 12 }}
                stroke={chartTheme.axisColor}
              />
            )}

            <RechartTooltip
              contentStyle={{
                backgroundColor: chartTheme.tooltipBg,
                border: `1px solid ${chartTheme.tooltipBorder}`,
                borderRadius: '6px',
              }}
              formatter={(value, name) => {
                if (typeof value !== 'number') return value

                // 가격 시리즈: 통화 포맷 적용
                const priceSeriesNames = [
                  '시가',
                  '종가',
                  '저가',
                  '고가',
                  '13주 MA',
                ]
                if (priceSeriesNames.includes(name as string)) {
                  return formatPrice(value, currency || ticker || '')
                }

                // 나머지 시리즈: 소수점 2자리
                return value.toFixed(2)
              }}
              labelFormatter={label => `날짜: ${label}`}
            />

            {/* 시가 라인 */}
            {enabledSeries.open && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="open"
                stroke={SERIES_CONFIG.open.color}
                strokeWidth={2}
                dot={false}
                name="시가"
                isAnimationActive={false}
              />
            )}

            {/* 종가 라인 */}
            {enabledSeries.close && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="close"
                stroke={SERIES_CONFIG.close.color}
                strokeWidth={2}
                dot={false}
                name="종가"
                isAnimationActive={false}
              />
            )}

            {/* 저가 라인 */}
            {enabledSeries.low && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="low"
                stroke={SERIES_CONFIG.low.color}
                strokeWidth={2}
                dot={false}
                name="저가"
                isAnimationActive={false}
              />
            )}

            {/* 고가 라인 */}
            {enabledSeries.high && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="high"
                stroke={SERIES_CONFIG.high.color}
                strokeWidth={2}
                dot={false}
                name="고가"
                isAnimationActive={false}
              />
            )}

            {/* 13주 MA 영역 */}
            {enabledSeries.ma13 && chartData.length >= 13 && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="ma13"
                stroke={SERIES_CONFIG.ma13.color}
                fill={SERIES_CONFIG.ma13.color}
                fillOpacity={0.2}
                dot={false}
                name="13주 MA"
                isAnimationActive={false}
              />
            )}

            {/* 13주 이동평균 기준 52주 YoY 영역 */}
            {enabledSeries.yoy && chartData.length >= 65 && (
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="yoy"
                stroke={SERIES_CONFIG.yoy.color}
                fill={SERIES_CONFIG.yoy.color}
                fillOpacity={0.2}
                dot={false}
                name="13주 이동평균 기준 전년동기 대비 증감률(52주 YoY)"
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
