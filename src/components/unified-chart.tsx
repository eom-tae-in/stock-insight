'use client'

import { useState } from 'react'
import { Download, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { matchPriceAndTrends, calculateWeeklyYoY } from '@/lib/calculations'
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { UnifiedChartProps } from '@/types'

const SERIES_CONFIG = {
  close: {
    name: '종가',
    color: '#3b82f6',
    yAxisId: 'left',
    enabled: true,
  },
  ma13: {
    name: '13주 MA',
    color: '#f97316',
    yAxisId: 'left',
    enabled: true,
  },
  week52High: {
    name: '52주 최고가',
    color: '#22c55e',
    yAxisId: 'left',
    enabled: true,
  },
  week52Low: {
    name: '52주 최저가',
    color: '#ef4444',
    yAxisId: 'left',
    enabled: true,
  },
  trends: {
    name: '검색 관심도',
    color: '#a78bfa',
    yAxisId: 'middle',
    enabled: true,
  },
  yoy: {
    name: '52주 YoY',
    color: '#f59e0b',
    yAxisId: 'right',
    enabled: true,
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
  priceData,
  trendsData,
  ma13,
  metrics,
  onDownload,
  initialEnabledSeries,
  timeRange,
}: UnifiedChartProps & {
  initialEnabledSeries?: string[]
  timeRange?: number
}) {
  const [enabledSeries, setEnabledSeries] = useState<
    Record<SeriesKey, boolean>
  >(
    initialEnabledSeries
      ? {
          close: initialEnabledSeries.includes('close'),
          ma13: initialEnabledSeries.includes('ma13'),
          week52High: initialEnabledSeries.includes('week52High'),
          week52Low: initialEnabledSeries.includes('week52Low'),
          trends: initialEnabledSeries.includes('trends'),
          yoy: initialEnabledSeries.includes('yoy'),
        }
      : {
          close: true,
          ma13: true,
          week52High: true,
          week52Low: true,
          trends: true,
          yoy: true,
        }
  )

  // 기간 선택 상태
  const [displayRange, setDisplayRange] = useState(timeRange || 260) // 기본값: 5년
  const [customRange, setCustomRange] = useState('')
  const [rangeLabel, setRangeLabel] = useState<string | null>(null)

  const handleRangeChange = (weeks: number, label: string) => {
    setDisplayRange(weeks)
    setCustomRange('')
    setRangeLabel(label)

    // 진동 피드백
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    // 레이블 2초 후 사라짐
    setTimeout(() => setRangeLabel(null), 2000)
  }

  const handleCustomRange = (value: string) => {
    setCustomRange(value)
    const weeks = parseInt(value)
    if (weeks > 0 && weeks <= 260) {
      setDisplayRange(weeks)
      setRangeLabel(`${weeks}주`)

      // 진동 피드백
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }

      // 레이블 2초 후 사라짐
      setTimeout(() => setRangeLabel(null), 2000)
    }
  }

  // 데이터 병합: price + trends (matchPriceAndTrends 재사용)
  const matchedData = matchPriceAndTrends(priceData, trendsData)

  // 주별 YoY 계산
  const weeklyYoY = calculateWeeklyYoY(priceData)

  // 모든 데이터 병합
  const fullChartData = priceData.map((point, index) => ({
    date: point.date,
    close: point.close,
    ma13: ma13?.[index] ?? null,
    week52High: metrics.week52High,
    week52Low: metrics.week52Low,
    trends: matchedData.find(d => d.date === point.date)?.trend ?? null,
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

  return (
    <div className="space-y-4">
      {/* 제목 및 컨트롤 */}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">통합 분석 차트</h3>

        {/* 우측 시간 범위 컨트롤 패널 */}
        <div className="flex items-center gap-2">
          {/* Preset 버튼들 */}
          <div className="flex gap-1">
            {TIME_RANGE_PRESETS.map(preset => (
              <button
                key={preset.weeks}
                onClick={() => handleRangeChange(preset.weeks, preset.label)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  displayRange === preset.weeks && customRange === ''
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

          {/* 다운로드 버튼 */}
          <Button
            size="sm"
            variant="outline"
            onClick={onDownload}
            disabled={!onDownload}
            aria-label="통합 분석 차트를 PNG로 다운로드"
          >
            <Download className="mr-2 h-4 w-4" />
            PNG 다운로드
          </Button>

          {/* 임시 레이블 표시 */}
          {rangeLabel && (
            <div className="ml-2 rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              {rangeLabel}
            </div>
          )}
        </div>
      </div>

      {/* 토글 버튼 (현대적 디자인) */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SERIES_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => toggleSeries(key as SeriesKey)}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
              enabledSeries[key as SeriesKey]
                ? 'bg-opacity-100 text-white'
                : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 border bg-transparent'
            }`}
            style={
              enabledSeries[key as SeriesKey]
                ? { backgroundColor: config.color }
                : {}
            }
          >
            <span
              className="flex h-2 w-2 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            {config.name}
            {enabledSeries[key as SeriesKey] && <Check className="h-3 w-3" />}
          </button>
        ))}
      </div>

      {/* 차트 */}
      <div
        className="bg-card rounded-lg border p-4"
        style={{ overflow: 'hidden' }}
      >
        <ResponsiveContainer width="100%" height={500}>
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 120, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              interval={tickInterval}
              angle={-45}
              textAnchor="end"
              height={80}
              stroke="#9ca3af"
            />

            {/* 좌측 Y축: 가격 ($) */}
            {(enabledSeries.close ||
              enabledSeries.ma13 ||
              enabledSeries.week52High ||
              enabledSeries.week52Low) && (
              <YAxis
                yAxisId="left"
                label={{
                  value: '가격 ($)',
                  angle: -90,
                  position: 'insideLeft',
                }}
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
            )}

            {/* 중간 Y축: 검색 관심도 (0-100) */}
            {enabledSeries.trends && (
              <YAxis
                yAxisId="middle"
                orientation="right"
                domain={[0, 100]}
                label={{
                  value: '검색 관심도 (0-100)',
                  angle: 90,
                  position: 'right',
                  offset: 10,
                }}
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
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
                stroke="#9ca3af"
              />
            )}

            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
              }}
              formatter={value => {
                if (typeof value === 'number') {
                  return value.toFixed(2)
                }
                return value
              }}
              labelFormatter={label => `날짜: ${label}`}
            />

            {/* 52주 최고가 (ReferenceLine) */}
            {enabledSeries.week52High && (
              <ReferenceLine
                yAxisId="left"
                y={metrics.week52High}
                stroke={SERIES_CONFIG.week52High.color}
                strokeDasharray="5 5"
                label={{
                  value: `52주 최고: $${metrics.week52High.toFixed(2)}`,
                  position: 'right',
                  fill: SERIES_CONFIG.week52High.color,
                  fontSize: 12,
                }}
              />
            )}

            {/* 52주 최저가 (ReferenceLine) */}
            {enabledSeries.week52Low && (
              <ReferenceLine
                yAxisId="left"
                y={metrics.week52Low}
                stroke={SERIES_CONFIG.week52Low.color}
                strokeDasharray="5 5"
                label={{
                  value: `52주 최저: $${metrics.week52Low.toFixed(2)}`,
                  position: 'right',
                  fill: SERIES_CONFIG.week52Low.color,
                  fontSize: 12,
                }}
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

            {/* 검색 관심도 영역 */}
            {enabledSeries.trends && (
              <Area
                yAxisId="middle"
                type="monotone"
                dataKey="trends"
                fill={SERIES_CONFIG.trends.color}
                stroke={SERIES_CONFIG.trends.color}
                fillOpacity={0.2}
                strokeWidth={2}
                dot={false}
                name="검색 관심도"
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
          좌측은 주가($), 우측은 검색 관심도와 YoY(%)를 표시합니다.
        </p>
      </div>
    </div>
  )
}
