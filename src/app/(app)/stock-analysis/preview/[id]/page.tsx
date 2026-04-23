import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { MetricsSummary } from '@/components/stock/metrics-summary'
import { UnifiedChart } from '@/components/stock/unified-chart'
import { calculateMetrics, calculateMA13 } from '@/lib/calculations'
import { Table as TableIcon } from 'lucide-react'
import { SavePreviewButton } from '@/components/stock/save-preview-button'
import { getStockPreview } from '@/server/stock-preview-service'

interface AnalysisPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function StockAnalysisPreviewPage({
  params,
}: AnalysisPageProps) {
  const { id } = await params

  const previewData = await getStockPreview(id)

  if (!previewData) {
    notFound()
  }

  const metrics = calculateMetrics(previewData.priceData)
  const ma13Values = calculateMA13(previewData.priceData)

  // Record 형식으로 변환
  const record = {
    id,
    ticker: previewData.ticker,
    company_name: previewData.companyName,
    currency: previewData.currency,
    price_data: previewData.priceData,
  }

  return (
    <main className="flex-1">
      <Container className="py-8">
        {/* 버튼 영역: 종목 검색으로 돌아가기 + 저장 */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/search">
            <button className="inline-flex h-10 items-center justify-center rounded-md bg-slate-400 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-500 dark:bg-slate-600 dark:hover:bg-slate-700">
              ← 종목 검색으로 돌아가기
            </button>
          </Link>
          <SavePreviewButton searchId={record.id} ticker={record.ticker} />
        </div>

        {/* 제목 및 종목 정보 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            {record.ticker} - {record.company_name}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            마지막 업데이트: {new Date().toLocaleDateString('ko-KR')}
          </p>
        </div>

        {/* 지표 요약 */}
        <section className="mb-8">
          <MetricsSummary
            metrics={metrics}
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

        {/* 표로 보기 버튼 */}
        <section className="mb-8">
          <Link href={`/stock-analysis/preview/${record.id}/table`}>
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
