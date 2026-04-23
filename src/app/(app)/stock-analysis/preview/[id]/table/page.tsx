import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/data-table'
import { TableHeader } from '@/components/shared/table-header'
import { calculateMA13, calculateWeeklyYoY } from '@/lib/calculations'
import { ArrowLeft } from 'lucide-react'
import { getStockPreview } from '@/server/stock-preview-service'

interface TablePageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function PreviewTablePage({ params }: TablePageProps) {
  const { id } = await params

  const previewData = await getStockPreview(id)
  if (!previewData) {
    notFound()
  }

  const record = {
    id,
    ticker: previewData.ticker,
    company_name: previewData.companyName,
    currency: previewData.currency,
    price_data: previewData.priceData,
  }

  const ma13Values = calculateMA13(record.price_data)
  const weeklyYoY = calculateWeeklyYoY(record.price_data)

  // 테이블 데이터 구성 (Excel 다운로드용)
  const tableData = record.price_data.map((price, index) => ({
    date: price.date,
    close: price.close,
    trends: 0, // 엑셀 다운로드 타입 호환성 유지 (사용되지 않음)
    ma13: ma13Values[index] ?? null,
    yoy: weeklyYoY[index] ?? 0,
  }))

  return (
    <main className="flex-1">
      <Container className="py-8">
        {/* 뒤로가기 버튼 */}
        <div className="mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/stock-analysis/preview/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              차트로 보기
            </Link>
          </Button>
        </div>

        {/* 제목 및 Excel 다운로드 */}
        <TableHeader
          ticker={record.ticker}
          companyName={record.company_name}
          tableData={tableData}
        />

        {/* 마지막 업데이트 */}
        <p className="text-muted-foreground mb-8 text-sm">
          마지막 업데이트: {new Date().toLocaleDateString('ko-KR')}
        </p>

        {/* 데이터 테이블 */}
        <section>
          <DataTable
            ticker={record.ticker}
            currency={record.currency}
            priceData={record.price_data}
            ma13Values={ma13Values}
          />
        </section>
      </Container>
    </main>
  )
}
