/**
 * 키워드 커스텀 목록 페이지
 * Route: /keywords/[keywordId]
 * - 저장된 키워드에 연결된 모든 종목(overlay) 표시
 * - 각 종목별 커스텀 분석 보기 가능
 */

import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getKeywordSearchById, getKeywordStockOverlays } from '@/lib/db/queries'
import { KeywordDetailClient } from '@/components/keyword-detail/keyword-detail-client'
import type { KeywordStockOverlay, SearchRecord } from '@/types/database'

type OverlayDetail = KeywordStockOverlay & Partial<SearchRecord>

export const metadata = {
  title: '키워드 커스텀 목록 | StockInsight',
  description: '저장된 키워드의 종목 오버레이 리스트',
}

export default async function KeywordDetailPage({
  params,
}: {
  params: Promise<{ keywordId: string }>
}) {
  // 인증 확인
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { keywordId } = await params

  // 키워드 정보 조회
  const keyword = await getKeywordSearchById(keywordId, supabase)
  if (!keyword) {
    redirect('/trends')
  }

  // 키워드에 연결된 overlay 조회
  let overlays: KeywordStockOverlay[] = []
  let overlayDetails: OverlayDetail[] = []

  try {
    overlays = await getKeywordStockOverlays(keywordId, supabase)

    // 각 overlay의 종목 정보(SearchRecord) 조회
    if (overlays.length > 0) {
      overlayDetails = await Promise.all(
        overlays.map(async overlay => {
          // /api/searches/[id] 엔드포인트에서 종목 정보 조회
          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000'

          const response = await fetch(
            `${baseUrl}/api/searches/${overlay.search_id}`,
            {
              // 캐시 비활성화 (항상 최신 데이터 조회)
              cache: 'no-store',
            }
          )

          if (!response.ok) {
            console.error(
              `Failed to fetch search ${overlay.search_id}:`,
              response.status
            )
            return {
              ...overlay,
              ticker: 'N/A',
              company_name: 'Unknown',
              current_price: 0,
              yoy_change: 0,
            }
          }

          const { data: searchRecord } = await response.json()
          return {
            ...overlay,
            ...searchRecord,
          }
        })
      )
    }
  } catch (error) {
    console.error('Failed to fetch overlays or search records:', error)
    // 에러 발생해도 overlay 목록만 표시
    overlayDetails = overlays.map(o => ({
      ...o,
      ticker: 'N/A',
      company_name: 'Unknown',
      current_price: 0,
      yoy_change: 0,
    }))
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <KeywordDetailClient
          keyword={keyword}
          overlayDetails={overlayDetails}
        />
      </main>
    </div>
  )
}
