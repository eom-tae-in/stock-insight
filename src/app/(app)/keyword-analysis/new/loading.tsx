import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * /keyword-analysis/new 경로 로딩 상태
 * - Supabase 인증 확인 중 표시
 * - Skeleton 기반 체감 성능 개선
 */
export default function KeywordAnalysisNewLoading() {
  return (
    <div className="bg-background min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        {/* 제목 */}
        <div className="mb-8">
          <Skeleton className="h-10 w-64" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* 좌측: 저장된 키워드 목록 Skeleton */}
          <div className="space-y-3 lg:col-span-1">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </CardContent>
            </Card>
          </div>

          {/* 우측: 입력 및 차트 영역 */}
          <div className="space-y-6 lg:col-span-3">
            {/* 검색 폼 Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-20" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-9 w-32 flex-1" />
                  <Skeleton className="h-9 w-32 flex-1" />
                  <Skeleton className="h-9 w-32 flex-1" />
                </div>
              </CardContent>
            </Card>

            {/* 차트 Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-96 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
