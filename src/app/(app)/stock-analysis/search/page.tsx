import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { MetricsSummary } from '@/components/stock/metrics-summary'
import { UnifiedChart } from '@/components/stock/unified-chart'
import { SaveStockButton } from '@/components/stock/save-stock-button'
import { calculateMetrics, calculateMA13 } from '@/lib/calculations'
import { TickerInputSchema } from '@/lib/validation'
import {
  STOCK_DATA_INTERVAL,
  STOCK_DATA_PERIOD,
} from '@/server/cached-stock-service'
import { getStockAnalysisData } from '@/server/stock-analysis-service'
import { Table as TableIcon } from 'lucide-react'

interface StockAnalysisSearchPageProps {
  searchParams: Promise<{
    ticker?: string
    period?: string
    interval?: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function StockAnalysisSearchPage({
  searchParams,
}: StockAnalysisSearchPageProps) {
  const params = await searchParams
  const ticker = params.ticker?.trim().toUpperCase()
  const period = params.period?.toUpperCase() ?? STOCK_DATA_PERIOD
  const interval = params.interval ?? STOCK_DATA_INTERVAL

  const tickerResult = TickerInputSchema.safeParse(ticker)

  if (
    !tickerResult.success ||
    period !== STOCK_DATA_PERIOD ||
    interval !== STOCK_DATA_INTERVAL
  ) {
    notFound()
  }

  const stockData = await getStockAnalysisData(tickerResult.data)
  if (!stockData) {
    notFound()
  }

  const metrics = calculateMetrics(stockData.priceData)
  const ma13Values = calculateMA13(stockData.priceData)
  const tableHref = `/stock-analysis/search/table?ticker=${encodeURIComponent(stockData.ticker)}&period=${STOCK_DATA_PERIOD}&interval=${STOCK_DATA_INTERVAL}`

  return (
    <main className="flex-1">
      <Container className="py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/search">
            <button className="inline-flex h-10 items-center justify-center rounded-md bg-slate-400 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-500 dark:bg-slate-600 dark:hover:bg-slate-700">
              ← 종목 검색으로 돌아가기
            </button>
          </Link>
          <SaveStockButton
            ticker={stockData.ticker}
            companyName={stockData.companyName}
            currency={stockData.currency}
            priceData={stockData.priceData}
          />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            {stockData.ticker} - {stockData.companyName}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            기준: {STOCK_DATA_PERIOD} / {STOCK_DATA_INTERVAL}
          </p>
        </div>

        <section className="mb-8">
          <MetricsSummary
            metrics={metrics}
            ticker={stockData.ticker}
            currency={stockData.currency}
          />
        </section>

        <section className="mb-8">
          <UnifiedChart
            ticker={stockData.ticker}
            currency={stockData.currency}
            priceData={stockData.priceData}
            ma13={ma13Values}
            metrics={metrics}
          />
        </section>

        <section className="mb-8">
          <Link href={tableHref}>
            <div className="group cursor-pointer">
              <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-8 transition-all hover:border-blue-500/40 hover:from-blue-500/15 hover:to-blue-500/10 hover:shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/20 transition-colors group-hover:bg-blue-500/30">
                    <TableIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">표로 보기</h3>
                    <p className="text-muted-foreground text-sm">
                      일정, 주가, 13주 이동평균선, 전년도 대비 성장률 데이터를
                      표로 조회합니다 ({stockData.priceData.length}개 항목)
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
