import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { TableHeader } from '@/components/table-header'
import { getSearchById } from '@/lib/db/queries'
import { calculateMA13, calculateWeeklyYoY } from '@/lib/calculations'
import { ArrowLeft } from 'lucide-react'

interface TablePageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function TablePage({ params }: TablePageProps) {
  const { id } = await params

  // DB에서 종목 데이터 직접 조회
  const record = await getSearchById(id)

  if (!record) {
    notFound()
  }

  const ma13Values = calculateMA13(record.price_data)
  const weeklyYoY = calculateWeeklyYoY(record.price_data)

  // 테이블 데이터 구성 (Excel 다운로드용)
  const trendsMap = new Map<string, number>()
  record.trends_data.forEach(item => {
    trendsMap.set(item.date, item.value)
  })

  const tableData = record.price_data.map((price, index) => ({
    date: price.date,
    close: price.close,
    trends: trendsMap.get(price.date) ?? 0,
    ma13: ma13Values[index] ?? null,
    yoy: weeklyYoY[index] ?? 0,
  }))

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Container className="py-8">
          {/* 뒤로가기 버튼 */}
          <div className="mb-6">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/analysis/${id}`}>
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
            마지막 업데이트:{' '}
            {new Date(record.last_updated_at).toLocaleDateString('ko-KR')}
          </p>

          {/* 데이터 테이블 */}
          <section>
            <DataTable
              ticker={record.ticker}
              priceData={record.price_data}
              trendsData={record.trends_data}
              ma13Values={ma13Values}
            />
          </section>
        </Container>
      </main>
    </div>
  )
}
