import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { getSearchById } from '@/lib/db/queries'
import { calculateMetrics, calculateMA13 } from '@/lib/calculations'
import { ArrowLeft } from 'lucide-react'

interface TablePageProps {
  params: Promise<{ id: string }>
}

export default async function TablePage({ params }: TablePageProps) {
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
          {/* 뒤로가기 버튼 */}
          <div className="mb-6">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/analysis/${id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                차트로 보기
              </Link>
            </Button>
          </div>

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

          {/* 데이터 테이블 */}
          <section>
            <DataTable
              priceData={record.price_data}
              trendsData={record.trends_data}
              ma13Values={ma13Values}
              yoyChange={metrics.yoyChange}
            />
          </section>
        </Container>
      </main>
    </div>
  )
}
