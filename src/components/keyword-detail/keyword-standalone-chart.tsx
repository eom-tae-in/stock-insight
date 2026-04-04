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
}

export function KeywordStandaloneChart({
  keyword,
  chartData,
  formattedDate,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>&quot;{keyword}&quot; 키워드 차트</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
              label={{
                value: '트렌드 지수 (0-100)',
                angle: -90,
                position: 'insideLeft',
                fill: 'hsl(var(--foreground))',
              }}
            />
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
            <Line
              type="monotone"
              dataKey="trendsValue"
              stroke="#3b82f6"
              name="트렌드 지수"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />

            {/* 13주 이동평균 (주황색) */}
            <Line
              type="monotone"
              dataKey="ma13Value"
              stroke="#f97316"
              name="13주 이동평균"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />

            {/* 52주 YoY (분홍색) */}
            <Line
              type="monotone"
              dataKey="yoyValue"
              stroke="#ec4899"
              name="52주 YoY"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* 메타정보 */}
        <div className="text-muted-foreground flex items-center justify-between border-t pt-4 text-xs">
          <span>5년 전체 데이터 ({chartData.length}주)</span>
          <span>{formattedDate}</span>
        </div>
      </CardContent>
    </Card>
  )
}
