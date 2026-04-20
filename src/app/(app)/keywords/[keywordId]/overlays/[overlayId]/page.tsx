/**
 * Overlay 상세 페이지
 * Route: /keywords/[keywordId]/overlays/[overlayId]
 * - 전체 5년 데이터 차트 표시
 * - 4개 라인 (MA13, YoY, 종목 주가, 트렌드)
 * - MA13, YoY 계산 표시
 * - 다운로드 기능
 */

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { OverlayDetailClient } from '@/components/overlays/overlay-detail-client'
import { getOverlayChartTimeseries } from '@/lib/db/queries'
import { getKeywordAnalysis } from '@/server/keyword-analyses-service'
import { listAnalysisOverlays } from '@/server/analysis-overlays-service'
import { getKeyword } from '@/server/keywords-service'
import type { TrendsDataPoint } from '@/types/database'

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
    redirect('/trends')
  }

  // 2. 기본 분석 기준의 키워드 차트 시계열 조회
  const analysis = await getKeywordAnalysis(supabase, user.id, keywordId)
  if (!analysis) {
    redirect(`/keywords/${keywordId}`)
  }
  const chartTimeseries = toChartTimeseries(analysis.trends_data)

  // 3. 분석 기준의 오버레이 정보 조회
  const overlays = await listAnalysisOverlays(supabase, user.id, analysis.id)
  const overlay = overlays.find(item => item.id === overlayId)

  if (!overlay) {
    redirect(`/keywords/${keywordId}`)
  }

  // 4. 오버레이 차트 시계열 조회
  const overlayChartData = await getOverlayChartTimeseries(overlayId, supabase)

  return (
    <OverlayDetailClient
      keyword={keyword}
      overlay={{
        id: overlay.id,
        ticker: overlay.ticker,
        companyName: overlay.company_name,
      }}
      chartData={chartTimeseries}
      overlayChartData={overlayChartData}
    />
  )
}
