/**
 * 키워드 분석 페이지 (재설계)
 * Route: /keywords/[keywordId]?region=GLOBAL&searchType=WEB
 *
 * 조건 조합(region, searchType) 기준의 5Y 분석 데이터 조회
 */

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getKeyword } from '@/server/keywords-service'
import { KeywordDetailClient } from '@/components/keyword/keyword-detail/keyword-detail-client'
import type { Region, Period, SearchType } from '@/types/database'

export const metadata = {
  title: '키워드 분석 | StockInsight',
  description: '키워드 분석 페이지',
}

const validRegions: Region[] = [
  'GLOBAL',
  'US',
  'KR',
  'JP',
  'GB',
  'DE',
  'FR',
  'CA',
  'AU',
  'IN',
  'BR',
  'CN',
  'TW',
  'HK',
  'SG',
]
const validSearchTypes: SearchType[] = [
  'WEB',
  'IMAGES',
  'NEWS',
  'YOUTUBE',
  'SHOPPING',
]

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
  const keyword = await getKeyword(supabase, user.id, keywordId)
  if (!keyword) {
    redirect('/keyword-analysis')
  }

  // 2. 차트 시계열 데이터는 클라이언트에서 API로 로드 (통일된 구조)

  // 쿼리 파라미터에서 필터 추출 (유효성 검사)
  const regionParam = (resolvedSearchParams.region as string) || 'GLOBAL'
  const searchTypeParam = (resolvedSearchParams.searchType as string) || 'WEB'

  const region: Region = validRegions.includes(regionParam as Region)
    ? (regionParam as Region)
    : 'GLOBAL'
  const searchType: SearchType = validSearchTypes.includes(
    searchTypeParam as SearchType
  )
    ? (searchTypeParam as SearchType)
    : 'WEB'

  return (
    <KeywordDetailClient
      keywordId={keywordId}
      keyword={keyword}
      initialSearchParams={{
        region,
        period: '5Y' as Period,
        searchType,
      }}
    />
  )
}
