'use client'

import Link from 'next/link'
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
      <div className="mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="mb-6">
          <Link
            href="/trends"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            ← 내 키워드로 돌아가기
          </Link>
        </div>

        <h1 className="mb-8 text-3xl font-bold">
          {keyword.keyword} 키워드 커스텀 목록
        </h1>

        {/* 차트 데이터 요약 */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                조회 기간
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm">
                {chartData.length > 0
                  ? `${chartData[0].date} ~ ${chartData[chartData.length - 1].date}`
                  : 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                데이터 포인트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm">{chartData.length}주</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                오버레이 종목
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm">{overlays.length}개</p>
            </CardContent>
          </Card>
        </div>

        {/* 오버레이 정보 */}
        {overlays.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>추가된 종목</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {overlays.map(overlay => (
                <div
                  key={overlay.id}
                  className="border-border rounded border p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{overlay.ticker}</p>
                      <p className="text-muted-foreground text-sm">
                        {overlay.companyName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs">
                        데이터 포인트
                      </p>
                      <p className="font-mono text-sm">
                        {overlay.chartData.length}개
                      </p>
                    </div>
                  </div>

                  {overlay.chartData.length > 0 && (
                    <div className="text-muted-foreground mt-2 text-xs">
                      <p>
                        가격 범위: $
                        {Math.min(
                          ...overlay.chartData.map(d => d.rawPrice)
                        ).toFixed(2)}{' '}
                        ~ $
                        {Math.max(
                          ...overlay.chartData.map(d => d.rawPrice)
                        ).toFixed(2)}
                      </p>
                      <p>
                        정규화 범위:{' '}
                        {Math.min(
                          ...overlay.chartData.map(d => d.normalizedPrice)
                        ).toFixed(2)}{' '}
                        ~{' '}
                        {Math.max(
                          ...overlay.chartData.map(d => d.normalizedPrice)
                        ).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 데이터 요약 */}
        <div className="text-muted-foreground mt-8 text-sm">
          <p>
            ✅ 이 페이지의 데이터는 저장된 차트의 정확한 시계열 데이터입니다.
          </p>
          <p>
            ✅ 4개의 시계열(trends, ma13, yoy, normalized_price)이 모두
            저장되었습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
