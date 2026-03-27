import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { MetricsSummary } from '@/components/metrics-summary'
import { PriceChart } from '@/components/price-chart'
import { TrendsChart } from '@/components/trends-chart'
import { ComparisonChart } from '@/components/comparison-chart'
import { getSearchById } from '@/lib/db/queries'
import { calculateMetrics, calculateMA13 } from '@/lib/calculations'
import { Download } from 'lucide-react'

interface AnalysisPageProps {
  params: Promise<{ id: string }>
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = await params

  // DB에서 종목 데이터 직접 조회
  const record = getSearchById(id)

  if (!record) {
    notFound()
  }

  const metrics = calculateMetrics(record.price_data)
  const ma13Values = calculateMA13(record.price_data)

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Container className="py-8">
          {/* 제목 및 종목 정보 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              {record.ticker} - {record.company_name}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              마지막 업데이트:{' '}
              {new Date(record.last_updated_at).toLocaleDateString('ko-KR')}
            </p>
          </div>

          {/* 지표 요약 */}
          <section className="mb-8">
            <MetricsSummary metrics={metrics} />
          </section>

          {/* 주가 + MA13 차트 */}
          <section className="mb-8">
            <PriceChart priceData={record.price_data} ma13={ma13Values} />
          </section>

          {/* Google Trends 차트 */}
          <section className="mb-8">
            <TrendsChart trendsData={record.trends_data} />
          </section>

          {/* 주가 vs 트렌드 비교 차트 */}
          <section className="mb-8">
            <ComparisonChart
              priceData={record.price_data}
              trendsData={record.trends_data}
            />
          </section>

          {/* 다운로드 섹션 */}
          <section className="bg-card rounded-lg border p-6">
            <h3 className="mb-4 text-lg font-semibold">데이터 다운로드</h3>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                disabled
                title="준비 중입니다"
                className="flex-1 sm:flex-none"
              >
                <Download className="mr-2 h-4 w-4" />
                엑셀 다운로드
              </Button>
              <Button
                variant="outline"
                disabled
                title="준비 중입니다"
                className="flex-1 sm:flex-none"
              >
                <Download className="mr-2 h-4 w-4" />
                전체 차트 PNG 다운로드
              </Button>
            </div>
          </section>
        </Container>
      </main>
    </div>
  )
}
