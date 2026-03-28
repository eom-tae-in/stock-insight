'use client'

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
import { format, parseISO } from 'date-fns'
import type { TrendsDataPoint, SearchRecord } from '@/types/database'
import { calculateTrendsMA13 } from '@/lib/indicators'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface KeywordTrendsChartProps {
  trendsData: TrendsDataPoint[]
  overlays: SearchRecord[]
}

export default function KeywordTrendsChart({
  trendsData,
  overlays,
}: KeywordTrendsChartProps) {
  // MA13 계산
  const ma13Values = calculateTrendsMA13(trendsData)

  // 차트 데이터 구성
  interface ChartDataPoint {
    date: string
    fullDate: string
    trendsValue: number
    ma13: number | null
    [key: string]: number | string | null
  }

  const chartData: ChartDataPoint[] = trendsData.map((point, idx) => {
    const row: ChartDataPoint = {
      date: format(parseISO(point.date), 'MMM dd'),
      fullDate: point.date,
      trendsValue: point.value,
      ma13: ma13Values[idx] ?? null,
    }

    // 오버레이 주식 데이터 추가
    overlays.forEach((search, overlayIdx) => {
      // search의 price_data에서 date와 매칭되는 close 값을 찾기
      const pricePoint = search.price_data?.find(p => p.date === point.date)
      if (pricePoint) {
        // 정규화: min-max normalization to 0-100
        const priceDataValues = search.price_data?.map(p => p.close) ?? []
        const minPrice = Math.min(...priceDataValues)
        const maxPrice = Math.max(...priceDataValues)
        const range = maxPrice - minPrice

        const normalized =
          range === 0 ? 50 : ((pricePoint.close - minPrice) / range) * 100

        row[`overlay${overlayIdx}`] = Math.round(normalized * 100) / 100
      }
    })

    return row
  })

  // 오버레이 색상 팔레트
  const overlayColors = ['#22c55e', '#a855f7', '#ef4444']

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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              interval={Math.floor(chartData.length / 12)}
            />

            {/* 왼쪽 Y축: 트렌드 지수 (0-100) */}
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              label={{
                value: '트렌드 지수 (0-100)',
                angle: -90,
                position: 'insideLeft',
              }}
            />

            {/* 오른쪽 Y축: 정규화된 주가 (0-100) */}
            {overlays.length > 0 && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                label={{
                  value: '정규화된 주가 (0-100)',
                  angle: 90,
                  position: 'insideRight',
                }}
              />
            )}

            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
              }}
              labelFormatter={label => {
                const labelStr = String(label)
                const row = chartData.find(r => r.date === labelStr)
                return row?.fullDate
                  ? format(parseISO(row.fullDate), 'yyyy-MM-dd')
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

            {/* 오버레이 라인들 */}
            {overlays.map((search, idx) => (
              <Line
                key={search.id}
                yAxisId="right"
                type="monotone"
                dataKey={`overlay${idx}`}
                stroke={overlayColors[idx % overlayColors.length]}
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
                  backgroundColor: overlayColors[idx % overlayColors.length],
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
