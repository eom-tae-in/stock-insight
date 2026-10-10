import { notFound } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { StockDetailSummary } from '@/components/stock/stock-detail-summary'
import { UnifiedChart } from '@/components/stock/unified-chart'
import { CustomChartBuilder } from '@/components/stock/custom-chart-builder'
import { CustomChartView } from '@/components/stock/custom-chart-view'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSavedSearch } from '@/server/stock-search-service'
import { calculateMetrics, calculateMA13 } from '@/lib/calculations'
import { StockWeeklyCard } from '@/components/stock/stock-weekly-card'
import { StockDetailRail } from '@/components/stock/stock-detail-rail'
import { getKeywords } from '@/server/keywords-service'
import { getStockDataCacheInfo } from '@/server/cached-stock-service'

interface AnalysisPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function StockAnalysisDetailPage({
  params,
}: AnalysisPageProps) {
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

  const record = await getSavedSearch(supabase, user.id, id)

  if (!record) {
    notFound()
  }

  const metrics = calculateMetrics(record.price_data)
  const ma13Values = calculateMA13(record.price_data)
  const keywords = await getKeywords(supabase, user.id)

  return (
    <main className="flex-1">
      <Container className="py-8">
        <section className="mb-8">
          <StockDetailSummary record={record} />
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
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
              <CustomChartBuilder
                searchId={record.id}
                ticker={record.ticker}
                priceData={record.price_data}
              />
            </section>

            {/* 저장된 커스텀 차트 */}
            <section className="mb-8">
              <CustomChartView
                searchId={record.id}
                ticker={record.ticker}
                currency={record.currency}
                priceData={record.price_data}
                ma13={ma13Values}
                metrics={metrics}
              />
            </section>
          </div>
          <StockDetailRail
            record={record}
            keywords={keywords}
            cacheTtlSeconds={getStockDataCacheInfo()}
          />
        </div>
        <div className="mt-6">
          <StockWeeklyCard record={record} />
        </div>
      </Container>
    </main>
  )
}
