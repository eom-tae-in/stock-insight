'use client'

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

  // 차트 데이터 병합 (overlayStock이 있으면)
  const mergedData = chartData.map(point => {
    const overlayPoint = overlayStock?.priceData.find(
      p => p.date === point.date
    )
    return {
      ...point,
      stockPrice: overlayPoint ? overlayPoint.price : null,
    }
  })

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl">
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {keyword}
          </span>
          <span className="text-foreground"> 트렌드</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 라인 토글 버튼 */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => onToggleLine('trendsValue')}
            variant={visibleLines.trendsValue ? 'default' : 'outline'}
            size="sm"
            className={
              visibleLines.trendsValue ? 'bg-blue-500 hover:bg-blue-600' : ''
            }
          >
            트렌드 지수
          </Button>
          <Button
            onClick={() => onToggleLine('ma13Value')}
            variant={visibleLines.ma13Value ? 'default' : 'outline'}
            size="sm"
            className={
              visibleLines.ma13Value ? 'bg-orange-500 hover:bg-orange-600' : ''
            }
          >
            13주 이동평균
          </Button>
          <Button
            onClick={() => onToggleLine('yoyValue')}
            variant={visibleLines.yoyValue ? 'default' : 'outline'}
            size="sm"
            className={
              visibleLines.yoyValue ? 'bg-pink-500 hover:bg-pink-600' : ''
            }
          >
            52주 YoY
          </Button>
          {overlayStock && (
            <Button
              onClick={() => onToggleLine('stockPrice')}
              variant={visibleLines.stockPrice ? 'default' : 'outline'}
              size="sm"
              className={
                visibleLines.stockPrice
                  ? 'bg-purple-500 hover:bg-purple-600'
                  : ''
              }
            >
              {overlayStock.ticker} 주가
            </Button>
          )}
        </div>

        <ResponsiveContainer width="100%" height={400}>
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
                value: '트렌드 지수 (0-100)',
                angle: -90,
                position: 'insideLeft',
                fill: 'hsl(var(--foreground))',
              }}
            />
            {overlayStock && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                label={{
                  value: `${overlayStock.ticker} 주가 ($)`,
                  angle: 90,
                  position: 'insideRight',
                  fill: 'hsl(var(--foreground))',
                }}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '4px',
                color: 'hsl(var(--foreground))',
              }}
            />
            <Legend />

            {/* 트렌드 지수 (파란색) */}
            {visibleLines.trendsValue && (
              <Line
                type="monotone"
                dataKey="trendsValue"
                stroke="#3b82f6"
                name="트렌드 지수"
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
                stroke="#f97316"
                name="13주 이동평균"
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
                stroke="#ec4899"
                name="52주 YoY"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                yAxisId="left"
              />
            )}

            {/* 종목 주가 (보라색) */}
            {overlayStock && visibleLines.stockPrice && (
              <Line
                type="monotone"
                dataKey="stockPrice"
                stroke="#a855f7"
                name={`${overlayStock.ticker} 주가`}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                yAxisId="right"
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* 메타정보 */}
        <div className="text-muted-foreground flex items-center justify-between border-t pt-4 text-xs">
          <span>전체 데이터 ({chartData.length}주)</span>
          <span>{formattedDate}</span>
        </div>
      </CardContent>
    </Card>
  )
}
