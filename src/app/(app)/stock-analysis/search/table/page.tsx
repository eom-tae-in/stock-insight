import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/data-table'
import { TableHeader } from '@/components/shared/table-header'
import { calculateMA13, calculateWeeklyYoY } from '@/lib/calculations'
import { TickerInputSchema } from '@/lib/validation'
import {
  STOCK_DATA_INTERVAL,
  STOCK_DATA_PERIOD,
} from '@/server/cached-stock-service'
import { getStockAnalysisData } from '@/server/stock-analysis-service'
import { ArrowLeft } from 'lucide-react'

interface StockAnalysisTablePageProps {
  searchParams: Promise<{
    ticker?: string
    period?: string
    interval?: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function StockAnalysisTablePage({
  searchParams,
}: StockAnalysisTablePageProps) {
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

  const ma13Values = calculateMA13(stockData.priceData)
  const weeklyYoY = calculateWeeklyYoY(stockData.priceData)
  const chartHref = `/stock-analysis/search?ticker=${encodeURIComponent(stockData.ticker)}&period=${STOCK_DATA_PERIOD}&interval=${STOCK_DATA_INTERVAL}`

  const tableData = stockData.priceData.map((price, index) => ({
    date: price.date,
    close: price.close,
    trends: 0,
    ma13: ma13Values[index] ?? null,
    yoy: weeklyYoY[index] ?? null,
  }))

  return (
    <main className="flex-1">
      <Container className="py-8">
        <div className="mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href={chartHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              차트로 보기
            </Link>
          </Button>
        </div>

        <TableHeader
          ticker={stockData.ticker}
          companyName={stockData.companyName}
          tableData={tableData}
        />

        <p className="text-muted-foreground mb-8 text-sm">
          기준: {STOCK_DATA_PERIOD} / {STOCK_DATA_INTERVAL}
        </p>

        <section>
          <DataTable
            ticker={stockData.ticker}
            currency={stockData.currency}
            priceData={stockData.priceData}
            ma13Values={ma13Values}
          />
        </section>
      </Container>
    </main>
  )
}
