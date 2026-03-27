'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TrendsChartProps } from '@/types'

export function TrendsChart({ trendsData, onDownload }: TrendsChartProps) {
  const chartData = trendsData.map(point => ({
    date: point.date,
    value: point.value,
  }))

  // X축 레이블: 매 12주마다 표시
  const tickInterval = Math.max(1, Math.floor(chartData.length / 12))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Google Trends 검색 관심도</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={onDownload}
          disabled={!onDownload}
          aria-label="Google Trends 검색 관심도 차트를 PNG로 다운로드"
        >
          <Download className="mr-2 h-4 w-4" />
          PNG 다운로드
        </Button>
      </div>

      <div className="bg-card rounded-lg border p-4">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <defs>
              {/* TODO: Phase 4에서 다크모드 지원 시 색상을 CSS 변수로 변경 */}
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
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
              domain={[0, 100]}
              label={{
                value: '관심도 (0-100)',
                angle: -90,
                position: 'insideLeft',
              }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={value => {
                if (typeof value === 'number') return `${value}`
                return value
              }}
              labelFormatter={label => `날짜: ${label}`}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorValue)"
              name="검색 관심도"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
