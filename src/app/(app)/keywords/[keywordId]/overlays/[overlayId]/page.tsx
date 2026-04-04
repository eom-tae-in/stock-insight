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
import { OverlayDetailClient } from '@/components/overlay-detail/overlay-detail-client'
import {
  getKeywordSearchById,
  getKeywordChartTimeseries,
  getOverlayChartTimeseries,
  getKeywordStockOverlays,
} from '@/lib/db/queries'

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
  const keyword = await getKeywordSearchById(keywordId, supabase)
  if (!keyword) {
    redirect('/trends')
  }

  // 2. 키워드 차트 시계열 조회
  const chartTimeseries = await getKeywordChartTimeseries(keywordId, supabase)

  // 3. 오버레이 정보 조회
  const overlayRecords = await getKeywordStockOverlays(keywordId, supabase)
  const overlay = overlayRecords.find(o => o.id === overlayId)

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
