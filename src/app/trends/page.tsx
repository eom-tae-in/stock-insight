/**
 * 내 키워드 목록 페이지 (사전 레이아웃)
 * Route: /trends
 * - 저장된 키워드 목록을 사전 형식으로 표시
 * - A-Z / ㄱ-ㅎ / # 탭으로 분류
 * - 키워드 클릭 시 /trends/search로 이동
 */

import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAllKeywordSearches } from '@/lib/db/queries'
import { MyKeywordsClient } from '@/components/keyword-trends/my-keywords-client'

export const metadata = {
  title: '내 키워드 | StockInsight',
  description: '저장된 키워드 목록 및 트렌드 분석',
}

export default async function TrendsPage() {
  // 인증 확인
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 저장된 키워드 목록 조회
  const initialKeywords = await getAllKeywordSearches(supabase)

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <MyKeywordsClient initialKeywords={initialKeywords} />
      </main>
    </div>
  )
}
