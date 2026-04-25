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
import { getOverlayChartTimeseries } from '@/lib/db/queries'
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

  // 2. overlayId가 실제 속한 analysis 조회
  const { data: overlayRecord, error: overlayError } = await supabase
    .from('keyword_stock_overlays')
    .select(
      `
        id,
        ticker,
        company_name,
        analysis_id,
        keyword_analysis!inner(
          id,
          keyword_id,
          region,
          search_type,
          trends_data
        )
      `
    )
    .eq('id', overlayId)
    .single()

  if (overlayError || !overlayRecord) {
    redirect(`/keywords/${keywordId}`)
  }

  const analysis = Array.isArray(overlayRecord.keyword_analysis)
    ? overlayRecord.keyword_analysis[0]
    : overlayRecord.keyword_analysis

  if (!analysis || analysis.keyword_id !== keywordId) {
    redirect(`/keywords/${keywordId}`)
  }

  const chartTimeseries = toChartTimeseries(
    (analysis.trends_data as TrendsDataPoint[]) ?? []
  )

  // 4. 오버레이 차트 시계열 조회
  const overlayChartData = await getOverlayChartTimeseries(overlayId, supabase)

  return (
    <OverlayDetailClient
      keyword={keyword}
      analysisContext={{
        region: analysis.region as Region,
        searchType: analysis.search_type as SearchType,
      }}
      overlay={{
        id: overlayRecord.id,
        ticker: overlayRecord.ticker,
        companyName: overlayRecord.company_name,
      }}
      chartData={chartTimeseries}
      overlayChartData={overlayChartData}
    />
  )
}
