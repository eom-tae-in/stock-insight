/**
 * 키워드 분석 페이지 (재설계)
 * Route: /keywords/[keywordId]?region=GLOBAL&period=5Y&searchType=WEB
 *
 * 조건 조합(region, period, searchType) 기준의 분석 데이터 조회
 */

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getKeywordSearchById,
  getKeywordChartTimeseries,
  getKeywordTemporaryOverlays,
} from '@/lib/db/queries'
import { KeywordDetailClient } from '@/components/keyword-detail/keyword-detail-client'
import type { Region, Period, SearchType } from '@/types/database'

export const metadata = {
  title: '키워드 분석 | StockInsight',
  description: '키워드 분석 페이지',
}

const validRegions: Region[] = ['GLOBAL', 'US', 'KR', 'JP', 'CN']
const validPeriods: Period[] = ['1Y', '3Y', '5Y']
const validSearchTypes: SearchType[] = ['WEB', 'YOUTUBE']

export default async function KeywordDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ keywordId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { keywordId } = await params
  const resolvedSearchParams = await searchParams

  // 1. 키워드 정보 조회 (기존 데이터 - 호환성)
  const keyword = await getKeywordSearchById(keywordId, supabase)
  if (!keyword) {
    redirect('/trends')
  }

  // 2. 차트 시계열 데이터 조회 (기존 데이터 - 초기값용)
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

  // 3. 임시 오버레이 목록 조회 (초기값용)
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

  // 쿼리 파라미터에서 필터 추출 (유효성 검사)
  const regionParam = (resolvedSearchParams.region as string) || 'GLOBAL'
  const periodParam = (resolvedSearchParams.period as string) || '5Y'
  const searchTypeParam = (resolvedSearchParams.searchType as string) || 'WEB'

  const region: Region = validRegions.includes(regionParam as Region)
    ? (regionParam as Region)
    : 'GLOBAL'
  const period: Period = validPeriods.includes(periodParam as Period)
    ? (periodParam as Period)
    : '5Y'
  const searchType: SearchType = validSearchTypes.includes(
    searchTypeParam as SearchType
  )
    ? (searchTypeParam as SearchType)
    : 'WEB'

  return (
    <KeywordDetailClient
      keywordId={keywordId}
      keyword={keyword}
      chartData={chartTimeseries}
      overlays={overlays}
      initialSearchParams={{
        region,
        period,
        searchType,
      }}
    />
  )
}
