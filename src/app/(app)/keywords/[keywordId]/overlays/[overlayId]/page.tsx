/**
 * Overlay 상세 페이지
 * Route: /keywords/[keywordId]/overlays/[overlayId]
 * - 전체 5년 데이터 차트 표시
 * - 4개 라인 (MA13, 13주 이동평균 기준 52주 YoY, 종목 주가, 트렌드)
 * - MA13, 13주 이동평균 기준 52주 YoY 계산 표시
 * - 다운로드 기능
 */

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { OverlayDetailClient } from '@/components/overlays/overlay-detail-client'
import { getKeyword } from '@/server/keywords-service'
import type { Region, SearchType, TrendsDataPoint } from '@/types/database'

interface OverlayDetailPageProps {
  params: Promise<{
    keywordId: string
    overlayId: string
  }>
}

export const metadata = {
  title: 'Overlay 상세 분석 | StockInsight',
  description: '종목과 키워드의 5년 시계열 데이터 상세 분석',
}

function toChartTimeseries(trendsData: TrendsDataPoint[]) {
  return trendsData.map((point, index) => ({
    weekIndex: index,
    date: point.date,
    trendsValue: point.value,
    ma13Value: point.ma13Value,
    yoyValue: point.yoyValue,
  }))
}

export default async function OverlayDetailPage({
  params,
}: OverlayDetailPageProps) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { keywordId, overlayId } = await params

  // 1. 키워드 조회
  const keyword = await getKeyword(supabase, user.id, keywordId)
  if (!keyword) {
    redirect('/keyword-analysis')
  }

  const analysis = keyword.analyses?.find(item =>
    item.overlays?.some(overlay => overlay.id === overlayId)
  )
  const overlayRecord = analysis?.overlays?.find(
    overlay => overlay.id === overlayId
  )

  if (!analysis || !overlayRecord) {
    redirect(`/keywords/${keywordId}`)
  }

  const chartTimeseries = toChartTimeseries(
    (analysis.trends_data as TrendsDataPoint[]) ?? []
  )

  return (
    <OverlayDetailClient
      keyword={keyword}
      analysisContext={{
        analysisId: analysis.id,
        region: analysis.region as Region,
        searchType: analysis.search_type as SearchType,
      }}
      overlay={{
        id: overlayRecord.id,
        ticker: overlayRecord.ticker,
        companyName: overlayRecord.company_name,
      }}
      chartData={chartTimeseries}
      overlayChartData={(overlayRecord.chart_data ?? []).map(point => ({
        date: point.date,
        normalizedPrice: point.normalizedPrice ?? 0,
        rawPrice: point.rawPrice ?? 0,
      }))}
    />
  )
}
