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

      {/* 차트 Skeleton (3개) */}
      <div className="space-y-6">
        {['주가 + MA13', 'Google Trends', '주가 vs 트렌드 비교'].map(title => (
          <div key={title}>
            <h3 className="mb-4 text-lg font-semibold">{title}</h3>
            <Skeleton className="h-[400px] w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
