'use client'

import type { ReactNode } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CHART_SERIES_COLORS } from '@/lib/constants/chart-series'

type ChartTooltipEntry = {
  color?: string
  dataKey?: string | number
  name?: string
  value?: number | string | null
}

function formatTooltipValue(entry: ChartTooltipEntry) {
  if (typeof entry.value !== 'number') {
    return entry.value ?? '-'
  }

  if (entry.dataKey === 'yoyValue') {
    return `${entry.value.toFixed(1)}%`
  }

  if (entry.dataKey === 'stockPrice') {
    return `$${entry.value.toFixed(2)}`
  }

  if (
    typeof entry.dataKey === 'string' &&
    entry.dataKey.startsWith('overlay_')
  ) {
    return entry.value.toFixed(2)
  }

  return Number.isInteger(entry.value)
    ? entry.value.toString()
    : entry.value.toFixed(2)
}

function ChartTooltipContent({
  active,
  label,
  payload,
}: {
  active?: boolean
  label?: string | number
  payload?: ChartTooltipEntry[]
}) {
  if (!active || !payload || payload.length === 0) return null

  const visiblePayload = payload.filter(
    entry => entry.value !== null && entry.value !== undefined
  )

  if (visiblePayload.length === 0) return null

  return (
    <div className="bg-background/95 border-border/80 min-w-56 rounded-md border px-3 py-2.5 shadow-lg backdrop-blur-sm">
      <div className="text-xs font-medium tracking-tight text-slate-700 dark:text-slate-200">
        {label}
      </div>
      <div className="mt-2 space-y-1.5">
        {visiblePayload.map(entry => (
          <div
            key={`${String(entry.dataKey)}-${entry.name}`}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color ?? 'currentColor' }}
              />
              <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                {entry.name}
              </span>
            </div>
            <span className="text-right text-xs font-semibold text-slate-950 tabular-nums dark:text-slate-50">
              {formatTooltipValue(entry)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface KeywordStandaloneChartProps {
  keyword: string
  chartData: Array<{
    weekIndex: number
    date: string
    trendsValue: number
    ma13Value: number | null
    yoyValue: number | null
  }>
  formattedDate: string
  overlayStock?: {
    ticker: string
    companyName: string
    priceData: Array<{
      date: string
      price: number
    }>
  }
  overlays?: Array<{
    id: string
    ticker: string
    companyName: string
    chartData: Array<{
      date: string
      normalizedPrice: number
      rawPrice: number
    }>
  }>
  timeframeType?: 'weeks' | 'years'
  timeframeValue?: number
  headerActions?: ReactNode
  controls?: ReactNode
  chartActions?: ReactNode
  visibleLines: {
    trendsValue: boolean
    ma13Value: boolean
    yoyValue: boolean
    stockPrice: boolean
  }
  onToggleLine: (
    lineKey: keyof KeywordStandaloneChartProps['visibleLines']
  ) => void
}

export function KeywordStandaloneChart({
  keyword,
  chartData,
  formattedDate,
  overlayStock,
  overlays = [],
  timeframeType = 'years',
  timeframeValue = 5,
  headerActions,
  controls,
  chartActions,
  visibleLines,
  onToggleLine,
}: KeywordStandaloneChartProps) {
  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground text-sm">데이터 없음</p>
        </CardContent>
      </Card>
    )
  }

  // timeframe 기준 필터링 (trends_data와 overlays.chartData 동일 범위)
  const getFilteredData = <T extends { date: string }>(data: T[]): T[] => {
    if (timeframeType === 'weeks') {
      const weeksToShow = Math.round(timeframeValue)
      return data.slice(-weeksToShow)
    } else {
      const weeksToShow = Math.round(timeframeValue * 52)
      return data.slice(-weeksToShow)
    }
  }

  const filteredChartData = getFilteredData(chartData)

  // 차트 데이터 병합 (overlayStock + overlays)
  const mergedData = filteredChartData.map(
    (point: {
      weekIndex: number
      date: string
      trendsValue: number
      ma13Value: number | null
      yoyValue: number | null
    }) => {
      const acc: {
        weekIndex: number
        date: string
        trendsValue: number
        ma13Value: number | null
        yoyValue: number | null
        stockPrice: number | null
        [key: string]: number | null | string
      } = {
        weekIndex: point.weekIndex,
        date: point.date,
        trendsValue: point.trendsValue,
        ma13Value: point.ma13Value,
        yoyValue: point.yoyValue,
        stockPrice: null, // selectedStock용
      }

      // selectedStock 병합 (overlayStock)
      if (overlayStock?.priceData) {
        const overlayPoint = overlayStock.priceData.find(
          p => p.date === point.date
        )
        acc.stockPrice = overlayPoint ? overlayPoint.price : null
      }

      // DB 저장된 overlays 병합
      overlays.forEach(overlay => {
        // overlay.chartData도 같은 timeframe으로 필터링
        const filteredOverlayData = getFilteredData(overlay.chartData)
        const overlayPoint = filteredOverlayData.find(
          p => p.date === point.date
        )
        acc[`overlay_${overlay.id}`] = overlayPoint
          ? overlayPoint.normalizedPrice
          : null
      })

      return acc
    }
  )

  // Y축 범위 계산 (주가 데이터 포함)
  let minPrice = Infinity
  let maxPrice = -Infinity

  // selectedStock 주가 범위
  if (overlayStock?.priceData) {
    overlayStock.priceData.forEach(p => {
      minPrice = Math.min(minPrice, p.price)
      maxPrice = Math.max(maxPrice, p.price)
    })
  }

  // overlays 범위 (정규화된 값: 0-100)
  overlays.forEach(overlay => {
    overlay.chartData.forEach(p => {
      minPrice = Math.min(minPrice, p.normalizedPrice)
      maxPrice = Math.max(maxPrice, p.normalizedPrice)
    })
  })

  // 유효한 범위가 없으면 기본값
  const priceAxisDomain =
    minPrice === Infinity
      ? [0, 100]
      : [Math.floor(minPrice * 0.95), Math.ceil(maxPrice * 1.05)]

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <CardTitle className="text-2xl">
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {keyword}
          </span>
          <span className="text-foreground"> 트렌드</span>
        </CardTitle>
        {headerActions && (
          <div className="flex shrink-0 justify-end">{headerActions}</div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {controls && <div>{controls}</div>}
        <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => onToggleLine('trendsValue')}
              variant={visibleLines.trendsValue ? 'default' : 'outline'}
              size="sm"
              className={visibleLines.trendsValue ? 'text-white' : ''}
              style={
                visibleLines.trendsValue
                  ? { backgroundColor: CHART_SERIES_COLORS.googleTrends }
                  : undefined
              }
            >
              검색량 기반
            </Button>
            <Button
              onClick={() => onToggleLine('ma13Value')}
              variant={visibleLines.ma13Value ? 'default' : 'outline'}
              size="sm"
              className={visibleLines.ma13Value ? 'text-white' : ''}
              style={
                visibleLines.ma13Value
                  ? { backgroundColor: CHART_SERIES_COLORS.ma13 }
                  : undefined
              }
            >
              13주 이동평균(13주 MA)
            </Button>
            <Button
              onClick={() => onToggleLine('yoyValue')}
              variant={visibleLines.yoyValue ? 'default' : 'outline'}
              size="sm"
              className={visibleLines.yoyValue ? 'text-white' : ''}
              style={
                visibleLines.yoyValue
                  ? { backgroundColor: CHART_SERIES_COLORS.yoy }
                  : undefined
              }
            >
              전년동기 대비 증감률(52주 YoY)
            </Button>
            {overlayStock && (
              <Button
                onClick={() => onToggleLine('stockPrice')}
                variant={visibleLines.stockPrice ? 'default' : 'outline'}
                size="sm"
                className={visibleLines.stockPrice ? 'text-white' : ''}
                style={
                  visibleLines.stockPrice
                    ? { backgroundColor: CHART_SERIES_COLORS.price }
                    : undefined
                }
              >
                {overlayStock.ticker} 주가
              </Button>
            )}
          </div>
          {chartActions && (
            <div className="flex justify-start xl:-mt-8 xl:justify-end">
              {chartActions}
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height={520}>
          <LineChart
            data={mergedData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
            />
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
              label={{
                value: '검색량 기반 (0-100)',
                angle: -90,
                position: 'insideLeft',
                fill: 'hsl(var(--foreground))',
              }}
            />
            {(overlayStock || overlays.length > 0) && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={priceAxisDomain}
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                label={{
                  value: overlayStock
                    ? `${overlayStock.ticker} 주가 ($)`
                    : '가격 (정규화)',
                  angle: 90,
                  position: 'insideRight',
                  fill: 'hsl(var(--foreground))',
                }}
              />
            )}
            <Tooltip content={<ChartTooltipContent />} />
            <Legend />

            {/* 검색량 기반 (파란색) */}
            {visibleLines.trendsValue && (
              <Line
                type="monotone"
                dataKey="trendsValue"
                stroke={CHART_SERIES_COLORS.googleTrends}
                name="검색량 기반"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                yAxisId="left"
              />
            )}

            {/* 13주 이동평균 (주황색) */}
            {visibleLines.ma13Value && (
              <Line
                type="monotone"
                dataKey="ma13Value"
                stroke={CHART_SERIES_COLORS.ma13}
                name="13주 이동평균(13주 MA)"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                yAxisId="left"
              />
            )}

            {/* 52주 YoY (분홍색) */}
            {visibleLines.yoyValue && (
              <Line
                type="monotone"
                dataKey="yoyValue"
                stroke={CHART_SERIES_COLORS.yoy}
                name="전년동기 대비 증감률(52주 YoY)"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                yAxisId="left"
              />
            )}

            {/* 선택된 종목 주가 (보라색) */}
            {overlayStock && visibleLines.stockPrice && (
              <Line
                type="monotone"
                dataKey="stockPrice"
                stroke={CHART_SERIES_COLORS.price}
                name={`${overlayStock.ticker} 주가`}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                yAxisId="right"
              />
            )}

            {/* DB 저장된 overlays */}
            {overlays.map(overlay => {
              const dataKey = `overlay_${overlay.id}`

              return (
                <Line
                  key={overlay.id}
                  type="monotone"
                  dataKey={dataKey}
                  stroke={CHART_SERIES_COLORS.price}
                  name={`${overlay.ticker}`}
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                  yAxisId="right"
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>

        {/* 메타정보 */}
        <div className="text-muted-foreground flex items-center justify-between border-t pt-4 text-xs">
          <span>표시 데이터 ({filteredChartData.length}주)</span>
          <span>{formattedDate}</span>
        </div>
      </CardContent>
    </Card>
  )
}
