'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO, differenceInDays } from 'date-fns'
import type { TrendsDataPoint, SearchRecord } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OVERLAY_COLORS } from '@/lib/constants/trends'

/**
 * 날짜 범위 기반으로 X축 interval을 동적 계산
 * 표시되는 라벨 수를 기간별로 최적화 (너무 촘촘하지 않게)
 * - 1주: 0 (모든 데이터 표시, 약 7개)
 * - 1-6개월: 약 10개 라벨
 * - 6개월-2년: 약 8개 라벨
 * - 2년 이상: 약 10개 라벨
 */
function calculateXAxisInterval(trendsData: TrendsDataPoint[]): number {
  if (trendsData.length === 0) return 1

  const firstDate = parseISO(trendsData[0].date)
  const lastDate = parseISO(trendsData[trendsData.length - 1].date)
  const daysDiff = differenceInDays(lastDate, firstDate)

  if (daysDiff <= 14) {
    // 1-2주: 모든 라벨 표시 (약 7개)
    return 0
  } else if (daysDiff <= 180) {
    // 1-6개월: 약 10개 라벨
    return Math.max(1, Math.floor(trendsData.length / 10))
  } else if (daysDiff <= 730) {
    // 6개월-2년: 약 8개 라벨
    return Math.max(1, Math.floor(trendsData.length / 8))
  } else {
    // 2년 이상: 약 10개 라벨
    return Math.max(1, Math.floor(trendsData.length / 10))
  }
}

interface ChartDataPoint {
  date: string
  fullDate: string
  trendsValue: number
  ma13: number | null
  yoyValue: number | null
  [key: string]: number | string | null
}

interface KeywordTrendsChartProps {
  trendsData: TrendsDataPoint[]
  overlays: SearchRecord[]
  // P1-9: 부모에서 이미 계산된 ma13Values를 받아 중복 계산 방지
  ma13Values: (number | null)[]
  // F027: 52주 YoY 값 배열 (차트에 표시)
  yoyValuesArray?: (number | null)[]
}

export default function KeywordTrendsChart({
  trendsData,
  overlays,
  ma13Values,
  yoyValuesArray,
}: KeywordTrendsChartProps) {
  // P0-4 / P1-10: 오버레이별 Map 미리 계산 (O(n²) → O(n+m))
  const overlayMaps = useMemo(
    () =>
      overlays.map(search => {
        const prices = search.price_data?.map(p => p.close) ?? []
        if (prices.length === 0) return new Map<string, number>()

        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        const range = maxPrice - minPrice

        const map = new Map<string, number>()
        search.price_data?.forEach(p => {
          const normalized =
            range === 0 ? 50 : ((p.close - minPrice) / range) * 100
          map.set(p.date, Math.round(normalized * 100) / 100)
        })
        return map
      }),
    [overlays]
  )

  // P1-10: Tooltip label 조회용 Map (formatted date → fullDate)
  const formattedToFullDateMap = useMemo(() => {
    const map = new Map<string, string>()
    trendsData.forEach(point => {
      const formatted = format(parseISO(point.date), 'MMM dd')
      map.set(formatted, point.date)
    })
    return map
  }, [trendsData])

  // 날짜 범위 기반 X축 interval 계산
  const xAxisInterval = useMemo(
    () => calculateXAxisInterval(trendsData),
    [trendsData]
  )

  // 차트 데이터 구성
  const chartData: ChartDataPoint[] = useMemo(
    () =>
      trendsData.map((point, idx) => {
        const row: ChartDataPoint = {
          date: format(parseISO(point.date), 'MMM dd'),
          fullDate: point.date,
          trendsValue: point.value,
          ma13: ma13Values[idx] ?? null,
          yoyValue: yoyValuesArray?.[idx] ?? null,
        }

        // 오버레이 주식 데이터 추가 (Map 기반 O(1) 조회)
        overlays.forEach((_, overlayIdx) => {
          const normalized = overlayMaps[overlayIdx].get(point.date)
          if (normalized !== undefined) {
            row[`overlay${overlayIdx}`] = normalized
          }
        })

        return row
      }),
    [trendsData, ma13Values, overlays, overlayMaps, yoyValuesArray]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>트렌드 분석 차트</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 80, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
              interval={xAxisInterval}
            />

            {/* 왼쪽 Y축: 트렌드 지수 (0-100) */}
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
              label={{
                value: '트렌드 지수 (0-100)',
                angle: -90,
                position: 'insideLeft',
                fill: 'hsl(var(--foreground))',
              }}
            />

            {/* 오른쪽 Y축: 정규화된 주가 또는 YoY */}
            {overlays.length > 0 ? (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                label={{
                  value: '정규화된 주가 (0-100)',
                  angle: 90,
                  position: 'insideRight',
                  fill: 'hsl(var(--foreground))',
                }}
              />
            ) : (
              // 오버레이 없을 때: 오른쪽 Y축을 YoY용으로 사용
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                label={{
                  value: '52주 YoY (%)',
                  angle: 90,
                  position: 'insideRight',
                  fill: 'hsl(var(--foreground))',
                }}
              />
            )}

            {/* P1-10: Tooltip - O(n) find 제거, Map O(1) 조회 */}
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '4px',
                color: 'hsl(var(--foreground))',
              }}
              labelFormatter={label => {
                const labelStr = String(label)
                const fullDate = formattedToFullDateMap.get(labelStr)
                return fullDate
                  ? format(parseISO(fullDate), 'yyyy-MM-dd')
                  : labelStr
              }}
            />

            <Legend />

            {/* 트렌드 라인 */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="trendsValue"
              stroke="#3b82f6"
              name="트렌드 지수"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />

            {/* MA13 라인 */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ma13"
              stroke="#f97316"
              name="13주 이동평균"
              dot={false}
              strokeWidth={2}
              strokeDasharray="5 5"
              isAnimationActive={false}
            />

            {/* 52주 YoY 라인 (오버레이 있으면 3번째 Y축, 없으면 오른쪽 Y축) */}
            {yoyValuesArray && yoyValuesArray.some(v => v !== null) && (
              <Line
                yAxisId={overlays.length > 0 ? 'right' : 'right'}
                type="monotone"
                dataKey="yoyValue"
                stroke="#ec4899"
                name="52주 YoY"
                dot={false}
                strokeWidth={2}
                strokeDasharray="3 3"
                isAnimationActive={false}
              />
            )}

            {/* 오버레이 라인들 */}
            {overlays.map((search, idx) => (
              <Line
                key={search.id}
                yAxisId="right"
                type="monotone"
                dataKey={`overlay${idx}`}
                stroke={OVERLAY_COLORS[idx % OVERLAY_COLORS.length]}
                name={`${search.ticker} 주가`}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>

        {/* 범례 설명 */}
        <div className="text-muted-foreground mt-6 space-y-2 text-sm">
          <p>
            <span className="mr-2 inline-block h-0.5 w-8 bg-blue-500" />
            트렌드 지수: Google Trends 검색 관심도 (0-100)
          </p>
          <p>
            <span className="mr-2 inline-block h-0.5 w-8 bg-orange-500" />
            13주 이동평균: 트렌드 지수의 13주 이동평균
          </p>
          {overlays.map((search, idx) => (
            <p key={search.id}>
              <span
                className="mr-2 inline-block h-0.5 w-8"
                style={{
                  backgroundColor: OVERLAY_COLORS[idx % OVERLAY_COLORS.length],
                }}
              />
              {search.ticker} 주가: 5년 주가 정규화 값 (0-100)
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
