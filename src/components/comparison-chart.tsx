'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ComparisonChartProps } from '@/types'

export function ComparisonChart({
  priceData,
  trendsData,
  onDownload,
}: ComparisonChartProps) {
  // 동일 길이 시퀀스 기반 직접 매칭
  const chartData = priceData.map((point, index) => ({
    date: point.date,
    price: point.close,
    trends: trendsData[index]?.value ?? 0,
  }))

  // X축 레이블: 매 12주마다 표시
  const tickInterval = Math.max(1, Math.floor(chartData.length / 12))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">주가 vs Google Trends 비교</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={onDownload}
          disabled={!onDownload}
          aria-label="주가 vs Google Trends 비교 차트를 PNG로 다운로드"
        >
          <Download className="mr-2 h-4 w-4" />
          PNG 다운로드
        </Button>
      </div>

      <div className="bg-card rounded-lg border p-4">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 60, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              interval={tickInterval}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              yAxisId="left"
              label={{ value: '가격 ($)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              label={{
                value: '관심도 (0-100)',
                angle: 90,
                position: 'insideRight',
              }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={value => {
                if (typeof value === 'number') return value.toFixed(2)
                return value
              }}
              labelFormatter={label => `날짜: ${label}`}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="price"
              fill="#3b82f6"
              name="주가 ($)"
              opacity={0.7}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="trends"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="검색 관심도 (0-100)"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
