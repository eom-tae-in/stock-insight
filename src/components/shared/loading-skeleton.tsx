'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* 지표 카드 Skeleton (5개) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={`metric-${i}`}
            className="h-[120px] w-full rounded-lg"
          />
        ))}
      </div>

      {/* 통합 분석 차트 Skeleton */}
      <div className="space-y-4">
        {/* 차트 제목 + 컨트롤 패널 */}
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-6 w-32 rounded" />
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`preset-${i}`} className="h-8 w-12 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        </div>

        {/* 토글 버튼 + PNG 다운로드 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={`toggle-${i}`} className="h-8 w-24 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-9 w-32 flex-shrink-0 rounded-md" />
        </div>

        {/* 차트 본체 */}
        <Skeleton className="h-[500px] w-full rounded-lg" />

        {/* 차트 설명 */}
        <Skeleton className="h-12 w-full rounded" />
      </div>
    </div>
  )
}
