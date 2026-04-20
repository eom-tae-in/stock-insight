import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { MetricsSummary } from '@/components/stock/metrics-summary'
import { UnifiedChart } from '@/components/stock/unified-chart'
import { CustomChartBuilder } from '@/components/stock/custom-chart-builder'
import { CustomChartView } from '@/components/stock/custom-chart-view'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSearchById } from '@/lib/db/queries'
import { calculateMetrics, calculateMA13 } from '@/lib/calculations'
import { Table as TableIcon } from 'lucide-react'

interface AnalysisPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = await params

  // 인증된 서버 클라이언트로 종목 데이터 조회 (RLS 적용됨)
  const supabase = await createSupabaseServerClient()

  // 사용자 정보 조회
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    notFound()
  }

  // userId를 전달하여 RLS 검증 (필수)
  const record = await getSearchById(id, user.id, supabase)

  if (!record) {
    notFound()
  }

  const metrics = calculateMetrics(record.price_data)
  const ma13Values = calculateMA13(record.price_data)

  return (
    <main className="flex-1">
      <Container className="py-8">
        {/* 제목 및 종목 정보 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            {record.ticker} - {record.company_name}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            마지막 업데이트:{' '}
            {new Date(
              record.last_updated_at ?? record.searched_at
            ).toLocaleDateString('ko-KR')}
          </p>
        </div>

        {/* 지표 요약 */}
        <section className="mb-8">
          <MetricsSummary
            metrics={metrics}
            lastUpdatedAt={record.last_updated_at}
            ticker={record.ticker}
            currency={record.currency}
          />
        </section>

        {/* 통합 분석 차트 */}
        <section className="mb-8">
          <UnifiedChart
            ticker={record.ticker}
            currency={record.currency}
            priceData={record.price_data}
            ma13={ma13Values}
            metrics={metrics}
          />
        </section>

        {/* 커스텀 차트 빌더 */}
        <section className="mb-8">
          <CustomChartBuilder searchId={record.id} />
        </section>

        {/* 저장된 커스텀 차트 */}
        <section className="mb-8">
          <CustomChartView
            searchId={record.id}
            ticker={record.ticker}
            currency={record.currency}
            priceData={record.price_data}
            trendsData={record.trends_data}
            ma13={ma13Values}
            metrics={metrics}
          />
        </section>

        {/* 표로 보기 버튼 */}
        <section className="mb-8">
          <Link href={`/analysis/${record.id}/table`}>
            <div className="group cursor-pointer">
              <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-8 transition-all hover:border-blue-500/40 hover:from-blue-500/15 hover:to-blue-500/10 hover:shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/20 transition-colors group-hover:bg-blue-500/30">
                    <TableIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">표로 보기</h3>
                    <p className="text-muted-foreground text-sm">
                      일정, 주가, Google Trends, 13주 이동평균선, 전년도 대비
                      성장률 데이터를 표로 조회합니다 (
                      {record.price_data.length}개 항목)
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-blue-600 transition-transform group-hover:translate-x-1 dark:text-blue-400">
                    →
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </section>
      </Container>
    </main>
  )
}
