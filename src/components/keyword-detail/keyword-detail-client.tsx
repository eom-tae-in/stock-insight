'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { OverlayCard } from './overlay-card'
import type {
  KeywordSearchRecord,
  KeywordStockOverlay,
  SearchRecord,
} from '@/types/database'

type OverlayDetail = KeywordStockOverlay & Partial<SearchRecord>

interface KeywordDetailClientProps {
  keyword: KeywordSearchRecord
  overlayDetails: OverlayDetail[]
}

function EmptyOverlaysState({ keywordName }: { keywordName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 text-5xl" aria-hidden="true">
        🔍
      </div>
      <h2 className="mb-2 text-lg font-semibold">
        이 키워드에 추가된 종목이 없어요
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">
        검색 페이지에서 종목을 추가해보세요
      </p>
      <Link href={`/trends/search?keyword=${encodeURIComponent(keywordName)}`}>
        <Button>종목 추가하기</Button>
      </Link>
    </div>
  )
}

export function KeywordDetailClient({
  keyword,
  overlayDetails,
}: KeywordDetailClientProps) {
  return (
    <Container className="py-8 pb-24 sm:pb-8">
      {/* 헤더 */}
      <div className="mb-8">
        <Link
          href="/trends"
          className="text-primary mb-4 inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />내 키워드로 돌아가기
        </Link>
        <h1 className="text-3xl font-bold">
          {keyword.keyword} 키워드 커스텀 목록
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {overlayDetails.length}개의 종목이 저장됨
        </p>
      </div>

      {/* 콘텐츠 */}
      {overlayDetails.length === 0 ? (
        <EmptyOverlaysState keywordName={keyword.keyword} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {overlayDetails.map(overlay => (
            <OverlayCard
              key={overlay.id}
              overlay={overlay}
              keywordId={keyword.id}
            />
          ))}
        </div>
      )}
    </Container>
  )
}
