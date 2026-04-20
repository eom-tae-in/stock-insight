/**
 * 키워드 검색 페이지
 * Route: /keywords/search
 *
 * 순수 검색 페이지 - 키워드 검색 form만 제공
 * 검색 후 /trends/search?keyword=xxx로 이동
 */

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import KeywordSearchPageClient from '@/components/keyword/keyword-search-page/keyword-search-page-client'

export const metadata = {
  title: '키워드 검색 | StockInsight',
  description: '새로운 키워드를 검색하여 트렌드 분석 시작',
}

export default async function KeywordSearchPage() {
  // 인증 확인
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <KeywordSearchPageClient />
}
