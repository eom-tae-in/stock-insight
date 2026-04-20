import { Skeleton } from '@/components/ui/skeleton'

/**
 * /keyword-analysis 경로 로딩 상태 (내 키워드 사전 레이아웃)
 * - Supabase 인증 확인 중 표시
 * - Skeleton 기반 체감 성능 개선
 */
export default function KeywordAnalysisLoading() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header Skeleton */}
      <header className="bg-card border-b">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <Skeleton className="h-8 w-48" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          {/* 페이지 헤더 */}
          <div className="mb-8 flex items-center justify-between">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>

          {/* 사이드바 + 그리드 레이아웃 */}
          <div className="flex gap-0">
            {/* 좌측 사이드바 (w-12) */}
            <div className="w-12 shrink-0 space-y-1 border-r px-1 py-2">
              {Array(40)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded" />
                ))}
            </div>

            {/* 우측 그리드 */}
            <div className="flex-1 pl-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-lg" />
                  ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
