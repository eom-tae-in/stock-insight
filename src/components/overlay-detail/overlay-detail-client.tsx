'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { KeywordSearchRecord } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OverlayDetailClientProps {
  keyword: KeywordSearchRecord
  overlay: {
    id: string
    ticker: string
    companyName: string
  }
  chartData: Array<{
    weekIndex: number
    date: string
    trendsValue: number
    ma13Value: number | null
    yoyValue: number | null
  }>
  overlayChartData: Array<{
    date: string
    normalizedPrice: number
    rawPrice: number
  }>
}

export function OverlayDetailClient({
  keyword,
  overlay,
  chartData,
  overlayChartData,
}: OverlayDetailClientProps) {
  // 차트 데이터 병합
  const mergedChartData = useMemo(() => {
    const keywordMap = new Map(chartData.map(d => [d.date, d]))
    return overlayChartData.map(point => ({
      date: point.date,
      trendsValue: keywordMap.get(point.date)?.trendsValue ?? null,
      ma13Value: keywordMap.get(point.date)?.ma13Value ?? null,
      normalizedPrice: point.normalizedPrice,
      yoyValue: keywordMap.get(point.date)?.yoyValue ?? null,
    }))
  }, [chartData, overlayChartData])

  // 현재 MA13 값 (서버에서 계산된 값 사용)
  const currentMA13 = useMemo(() => {
    if (mergedChartData.length === 0) return null
    for (let i = mergedChartData.length - 1; i >= 0; i--) {
      if (mergedChartData[i].ma13Value !== null) {
        return mergedChartData[i].ma13Value
      }
    }
    return null
  }, [mergedChartData])

  // 현재 YoY 값 (서버에서 계산된 값 사용)
  const yoyChange = useMemo(() => {
    if (mergedChartData.length === 0) return null
    for (let i = mergedChartData.length - 1; i >= 0; i--) {
      if (mergedChartData[i].yoyValue !== null) {
        return mergedChartData[i].yoyValue
      }
    }
    return null
  }, [mergedChartData])

  const isPositiveYoY = yoyChange != null && yoyChange >= 0

  return (
    <div className="bg-background min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        {/* 헤더 */}
        <div className="mb-6">
          <Link
            href={`/keywords/${keyword.id}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            ← {keyword.keyword} 목록으로 돌아가기
          </Link>
        </div>

        <h1 className="mb-2 text-3xl font-bold">
          {overlay.ticker} / {keyword.keyword}
        </h1>
        <p className="text-muted-foreground mb-8 text-sm">
          {overlay.companyName}
        </p>

        {/* 지표 카드 */}
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                13주 이동평균
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {currentMA13 !== null ? currentMA13.toFixed(2) : 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                52주 YoY
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-3xl font-bold ${
                  yoyChange === null
                    ? 'text-gray-500 dark:text-gray-400'
                    : isPositiveYoY
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                }`}
              >
                {yoyChange !== null
                  ? `${yoyChange >= 0 ? '+' : ''}${yoyChange.toFixed(2)}%`
                  : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 전체 5년 차트 */}
        {mergedChartData.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>5년 시계열 분석</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={mergedChartData}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      interval={Math.floor(mergedChartData.length / 10)}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                      }}
                    />
                    <Legend />
                    {/* 라인1: 13주 이동평균 (주황색) */}
                    <Line
                      type="monotone"
                      dataKey="ma13Value"
                      stroke="hsl(38 92% 50%)"
                      strokeWidth={2}
                      isAnimationActive={false}
                      dot={false}
                      name="13주 이동평균"
                    />
                    {/* 라인2: 52주 YoY (분홍색) */}
                    <Line
                      type="monotone"
                      dataKey="yoyValue"
                      stroke="hsl(289 100% 58%)"
                      strokeWidth={2}
                      isAnimationActive={false}
                      dot={false}
                      name="52주 YoY"
                    />
                    {/* 라인3: 종목 주가 (초록색) */}
                    <Line
                      type="monotone"
                      dataKey="normalizedPrice"
                      stroke="hsl(142 72% 29%)"
                      strokeWidth={2}
                      isAnimationActive={false}
                      dot={false}
                      name={`${overlay.ticker} 주가`}
                    />
                    {/* 라인4: 트렌드 지수 (파란색) */}
                    <Line
                      type="monotone"
                      dataKey="trendsValue"
                      stroke="hsl(211 100% 50%)"
                      strokeWidth={2}
                      isAnimationActive={false}
                      dot={false}
                      name="트렌드 지수"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 데이터 정보 및 다운로드 */}
        <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:border-blue-800 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
                <span className="text-lg">📊</span>이 페이지의 데이터
              </h3>
              <ul className="space-y-2 text-xs text-blue-800 dark:text-blue-200">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 font-bold text-green-500">✓</span>
                  <span>5년 전체 시계열 데이터입니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 font-bold text-green-500">✓</span>
                  <span>
                    4개 라인: <span className="font-medium">13주 이동평균</span>
                    (주황색), <span className="font-medium">52주 YoY</span>
                    (분홍색), <span className="font-medium">종목 주가</span>
                    (초록색), <span className="font-medium">트렌드 지수</span>
                    (파란색)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 font-bold text-green-500">✓</span>
                  <span>모든 값은 0~100으로 정규화되어 있습니다</span>
                </li>
              </ul>
            </div>

            <div className="border-t border-blue-200 pt-4 dark:border-blue-800">
              <button
                onClick={() => {
                  const csv = [
                    [
                      '날짜',
                      '트렌드 지수',
                      '13주 이동평균',
                      '정규화 주가',
                      '52주 YoY',
                    ],
                    ...mergedChartData.map(d => [
                      d.date,
                      d.trendsValue ?? '',
                      d.ma13Value ?? '',
                      d.normalizedPrice,
                      d.yoyValue ?? '',
                    ]),
                  ]
                    .map(row => row.map(cell => `"${cell}"`).join(','))
                    .join('\n')

                  const blob = new Blob([csv], {
                    type: 'text/csv;charset=utf-8;',
                  })
                  const link = document.createElement('a')
                  const url = URL.createObjectURL(blob)
                  link.setAttribute('href', url)
                  link.setAttribute(
                    'download',
                    `${overlay.ticker}_${keyword.keyword}_analysis.csv`
                  )
                  link.style.visibility = 'hidden'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <span>📥</span>
                CSV로 다운로드
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
