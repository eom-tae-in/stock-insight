'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
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
import type { PriceChartProps } from '@/types'

export function PriceChart({ priceData, ma13, onDownload }: PriceChartProps) {
  // MA13 값을 priceData에 병합
  const chartData = priceData.map((point, index) => ({
    date: point.date,
    close: point.close,
    ma13: ma13?.[index] ?? null,
  }))

  // X축 레이블: 매 12주마다 표시
  const tickInterval = Math.max(1, Math.floor(chartData.length / 12))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">주가 + 13주 이동평균</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={onDownload}
          disabled={!onDownload}
          aria-label="주가 + 13주 이동평균 차트를 PNG로 다운로드"
        >
          <Download className="mr-2 h-4 w-4" />
          PNG 다운로드
        </Button>
      </div>

      <div className="bg-card rounded-lg border p-4">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
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
              label={{ value: '가격 ($)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={value => {
                if (typeof value === 'number') return `$${value.toFixed(2)}`
                return value
              }}
              labelFormatter={label => `날짜: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="종가"
              isAnimationActive={false}
            />
            {/* TODO: Phase 4에서 다크모드 지원 시 색상을 CSS 변수로 변경 */}
            <Line
              type="monotone"
              dataKey="ma13"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              name="13주 MA"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
