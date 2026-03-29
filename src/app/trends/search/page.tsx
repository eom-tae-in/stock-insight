/**
 * 키워드 트렌드 검색 페이지
 * Route: /trends/search
 * - 키워드 기반 Google Trends 5년 데이터 조회
 * - 13주 MA13, 52주 YoY 계산
 * - 주식 종목 오버레이 추가
 * - 키워드 + 종목 조합 저장
 */

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import KeywordTrendsClient from '@/components/keyword-trends/keyword-trends-client'

export const metadata = {
  title: '키워드 트렌드 검색 | StockInsight',
  description: 'Google Trends 키워드 기반 분석과 주식 비교',
}

export default async function TrendsSearchPage() {
  // 인증 확인
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <KeywordTrendsClient />
}
