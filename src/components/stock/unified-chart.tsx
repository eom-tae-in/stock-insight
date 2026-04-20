'use client'

import { useState, useRef } from 'react'
import { Download, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { calculateWeeklyYoY } from '@/lib/calculations'
import { captureChartAsPng } from '@/lib/export'
import { getCurrencySymbol, formatPrice } from '@/lib/utils/currency'
import { useChartTheme } from '@/hooks/use-chart-theme'
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
} from 'recharts'
import type { UnifiedChartProps } from '@/types'

const SERIES_CONFIG = {
  close: {
    name: '종가',
    color: '#3b82f6',
    yAxisId: 'left',
    enabled: true,
    minWeeks: 0,
  },
  ma13: {
    name: '13주 MA',
    color: '#f97316',
    yAxisId: 'left',
    enabled: true,
    minWeeks: 13,
  },
  yoy: {
    name: '52주 YoY',
    color: '#f59e0b',
    yAxisId: 'right',
    enabled: true,
    minWeeks: 52,
  },
}

type SeriesKey = keyof typeof SERIES_CONFIG

const TIME_RANGE_PRESETS = [
  { weeks: 52, label: '1년' },
  { weeks: 104, label: '2년' },
  { weeks: 156, label: '3년' },
  { weeks: 208, label: '4년' },
  { weeks: 260, label: '5년' },
]

export function UnifiedChart({
  ticker,
  currency,
  priceData,
  trendsData,
  ma13,
  // metrics는 타입 정의에만 필요하고 현재 사용하지 않음
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  metrics,
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
          close: initialEnabledSeries.includes('close'),
          ma13: initialEnabledSeries.includes('ma13'),
          yoy: initialEnabledSeries.includes('yoy'),
        }
      : {
          close: true,
          ma13: true,
          yoy: true,
        }
  )

  // 기간 선택 상태
  const [displayRange, setDisplayRange] = useState(timeRange || 260) // 기본값: 5년
  const [customRange, setCustomRange] = useState('')

  const disableAllSeries = () => {
    setEnabledSeries({
      close: true,
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
    const weeks = parseInt(value)
    if (value === '' || (weeks > 0 && weeks <= 260)) {
      setCustomRange(value)
      if (weeks > 0 && weeks <= 260) {
        setDisplayRange(weeks)
        disableAllSeries()

        // 진동 피드백
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      }
    }
  }

  // 주별 YoY 계산
  const weeklyYoY = calculateWeeklyYoY(priceData)

  // 모든 데이터 병합
  const fullChartData = priceData.map((point, index) => ({
    date: point.date,
    close: point.close,
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
    <div className="space-y-4">
      {/* 제목 및 시간 범위 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">통합 분석 차트</h3>

        {/* 우측 시간 범위 컨트롤 패널 */}
        <div className="flex items-center gap-2">
          {/* Preset 버튼들 */}
          <div className="flex gap-1">
            {TIME_RANGE_PRESETS.map(preset => (
              <button
                key={preset.weeks}
                onClick={() => handleRangeChange(preset.weeks)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  displayRange === preset.weeks
                    ? 'bg-blue-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom 입력 */}
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="1"
              max="260"
              value={customRange}
              onChange={e => handleCustomRange(e.target.value)}
              placeholder="주"
              className="h-8 w-16 text-xs"
            />
            <span className="text-muted-foreground text-xs">주</span>
          </div>
        </div>
      </div>

      {/* 토글 버튼 + PNG 다운로드 (현대적 디자인) */}
      <div className="flex items-center justify-between gap-2">
        <TooltipProvider>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SERIES_CONFIG).map(([key, config]) => {
              const isDisabled = displayRange < config.minWeeks
              return (
                <Tooltip key={key} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => toggleSeries(key as SeriesKey)}
                      disabled={isDisabled}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                        isDisabled
                          ? 'cursor-not-allowed opacity-50'
                          : enabledSeries[key as SeriesKey]
                            ? 'bg-opacity-100 text-white'
                            : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 border bg-transparent'
                      }`}
                      style={
                        !isDisabled && enabledSeries[key as SeriesKey]
                          ? { backgroundColor: config.color }
                          : {}
                      }
                    >
                      <span
                        className="flex h-2 w-2 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      {config.name}
                      {!isDisabled && enabledSeries[key as SeriesKey] && (
                        <Check className="h-3 w-3" />
                      )}
                    </button>
                  </TooltipTrigger>
                  {isDisabled && (
                    <TooltipContent
                      side="top"
                      className="flex items-center gap-1 bg-yellow-600/90"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>
                        {config.minWeeks}주 이상 입력하셔야 볼 수 있어요
                      </span>
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>

        {/* PNG 다운로드 버튼 */}
        <Button
          size="sm"
          variant="outline"
          onClick={onDownload ?? handleDownloadChart}
          disabled={isPngLoading}
          aria-label="통합 분석 차트를 PNG로 다운로드"
          className="flex-shrink-0"
        >
          <Download className="mr-2 h-4 w-4" />
          {isPngLoading ? '다운로드 중...' : 'PNG 다운로드'}
        </Button>
      </div>

      {/* 차트 */}
      <div
        ref={chartContainerRef}
        className="bg-card rounded-lg border p-4"
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

            {/* 우측 Y축: YoY (%) */}
            {enabledSeries.yoy && (
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{
                  value: 'YoY (%)',
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
                const priceSeriesNames = ['종가', '13주 MA']
                if (priceSeriesNames.includes(name as string)) {
                  return formatPrice(value, currency || ticker || '')
                }

                // 나머지 시리즈: 소수점 2자리
                return value.toFixed(2)
              }}
              labelFormatter={label => `날짜: ${label}`}
            />

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

            {/* 13주 MA 라인 */}
            {enabledSeries.ma13 && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="ma13"
                stroke={SERIES_CONFIG.ma13.color}
                strokeWidth={2}
                dot={false}
                name="13주 MA"
                isAnimationActive={false}
              />
            )}

            {/* 52주 YoY 바 */}
            {enabledSeries.yoy && (
              <Bar
                yAxisId="right"
                dataKey="yoy"
                fill={SERIES_CONFIG.yoy.color}
                fillOpacity={0.6}
                name="52주 YoY"
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 데이터 설명 */}
      <div className="bg-muted/50 text-muted-foreground rounded-lg p-4 text-sm">
        <p>
          💡 위의 토글 버튼을 클릭하여 원하는 데이터를 표시/숨길 수 있습니다.
          좌측은 주가({getCurrencySymbol(currency || ticker || '')}), 우측은
          YoY(%)를 표시합니다.
        </p>
      </div>
    </div>
  )
}
