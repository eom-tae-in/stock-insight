'use client'

import Link from 'next/link'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { KeywordSearchRecord } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface KeywordDetailClientProps {
  keyword: KeywordSearchRecord
  chartData: Array<{
    weekIndex: number
    date: string
    trendsValue: number
    ma13Value: number | null
    yoyValue: number | null
  }>
  overlays: Array<{
    id: string
    ticker: string
    companyName: string
    displayOrder: number
    chartData: Array<{
      date: string
      normalizedPrice: number
      rawPrice: number
    }>
  }>
}

export function KeywordDetailClient({
  keyword,
  chartData,
  overlays,
}: KeywordDetailClientProps) {
  return (
    <div className="bg-background min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        {/* 헤더 */}
        <div className="mb-6">
          <Link
            href="/trends"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            ← 내 키워드로 돌아가기
          </Link>
        </div>

        <h1 className="mb-2 text-3xl font-bold">
          {keyword.keyword} 키워드 커스텀 목록
        </h1>
        <p className="text-muted-foreground mb-8 text-sm">
          {chartData.length > 0
            ? `${chartData[0].date} ~ ${chartData[chartData.length - 1].date} (${chartData.length}주)`
            : '데이터 없음'}
          • 오버레이 {overlays.length}개
        </p>

        {/* 오버레이 그리드 */}
        {overlays.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {overlays.map(overlay => (
              <Card key={overlay.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold">{overlay.ticker}</p>
                      <p className="text-muted-foreground text-xs font-normal">
                        {overlay.companyName}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  {/* 미니 차트 */}
                  {overlay.chartData.length > 0 ? (
                    <div className="mb-4 flex-1">
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart
                          data={overlay.chartData}
                          margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            tick={false}
                            axisLine={false}
                            height={0}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={false}
                            axisLine={false}
                            width={30}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--background)',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="normalizedPrice"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            isAnimationActive={false}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-muted-foreground bg-muted flex items-center justify-center rounded py-8 text-sm">
                      데이터 없음
                    </div>
                  )}

                  {/* 통계 정보 */}
                  <div className="space-y-1 border-t pt-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        데이터 포인트
                      </span>
                      <span className="font-mono font-semibold">
                        {overlay.chartData.length}개
                      </span>
                    </div>
                    {overlay.chartData.length > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            가격 범위
                          </span>
                          <span className="font-mono font-semibold">
                            $
                            {Math.min(
                              ...overlay.chartData.map(d => d.rawPrice)
                            ).toFixed(2)}{' '}
                            ~{' '}
                            {Math.max(
                              ...overlay.chartData.map(d => d.rawPrice)
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            정규화 범위
                          </span>
                          <span className="font-mono font-semibold">
                            {Math.min(
                              ...overlay.chartData.map(d => d.normalizedPrice)
                            ).toFixed(1)}{' '}
                            ~{' '}
                            {Math.max(
                              ...overlay.chartData.map(d => d.normalizedPrice)
                            ).toFixed(1)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground text-sm">
                추가된 종목이 없습니다
              </p>
            </CardContent>
          </Card>
        )}

        {/* 데이터 정보 */}
        <div className="text-muted-foreground bg-muted/50 mt-12 rounded-lg border p-4 text-sm">
          <p className="mb-2">ℹ️ 이 페이지의 데이터</p>
          <ul className="space-y-1 text-xs">
            <li>✅ 저장된 차트의 정확한 시계열 데이터입니다</li>
            <li>
              ✅ 각 카드는 사용자가 저장한 오버레이 종목의 정규화된 가격입니다
            </li>
            <li>✅ 차트는 keyword_stock_overlays 테이블에서 조회되었습니다</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
