/**
 * 내 키워드 목록 페이지 (사전 레이아웃)
 * Route: /keyword-analysis
 * - 저장된 키워드 목록을 사전 형식으로 표시
 * - A-Z / ㄱ-ㅎ / # 탭으로 분류
 * - 키워드 클릭 시 /keyword-analysis/search로 이동
 */

import { getAppShellData } from '@/server/app-shell-data'
import { MyKeywordsClient } from '@/components/keyword/keyword-trends/my-keywords-client'

export const metadata = {
  title: '내 키워드 | StockInsight',
  description: '저장된 키워드 목록 및 트렌드 분석',
}

export default async function KeywordAnalysisPage() {
  const { keywords: initialKeywords } = await getAppShellData()

  return (
    <main className="flex-1">
      <MyKeywordsClient initialKeywords={initialKeywords} />
    </main>
  )
}
