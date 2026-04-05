/**
 * 키워드 커스텀 목록 페이지 (재설계)
 * Route: /keywords/[keywordId]
 *
 * 저장된 차트 데이터와 오버레이 데이터를 조회하여 페이지 렌더링
 */

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getKeywordSearchById,
  getKeywordChartTimeseries,
  getKeywordTemporaryOverlays,
} from '@/lib/db/queries'
import { KeywordDetailClient } from '@/components/keyword-detail/keyword-detail-client'

export const metadata = {
  title: '키워드 커스텀 목록 | StockInsight',
  description: '저장된 키워드의 종목 오버레이 리스트',
}

export default async function KeywordDetailPage({
  params,
}: {
  params: Promise<{ keywordId: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { keywordId } = await params

  // 1. 키워드 정보 조회
  const keyword = await getKeywordSearchById(keywordId, supabase)
  if (!keyword) {
    redirect('/trends')
  }

  // 2. 차트 시계열 데이터 조회
  let chartTimeseries: Array<{
    weekIndex: number
    date: string
    trendsValue: number
    ma13Value: number | null
    yoyValue: number | null
  }> = []

  try {
    chartTimeseries = await getKeywordChartTimeseries(keywordId, supabase)
  } catch (error) {
    console.error('Failed to fetch chart timeseries:', error)
  }

  // 3. 임시 오버레이 목록 조회 (keyword_temporary_overlays - 서버에서 초기값으로 전달)
  let overlays: Array<{
    id: string
    ticker: string
    companyName: string
    displayOrder: number
    chartData: Array<{
      date: string
      normalizedPrice: number
      rawPrice: number
    }>
  }> = []

  try {
    overlays = await getKeywordTemporaryOverlays(keywordId, supabase)
  } catch (error) {
    console.error('Failed to fetch temporary overlays:', error)
  }

  return (
    <KeywordDetailClient
      keyword={keyword}
      chartData={chartTimeseries}
      overlays={overlays}
    />
  )
}
