import { Header } from '@/components/layout/header'
import { Container } from '@/components/layout/container'

interface AnalysisPageProps {
  params: Promise<{ id: string }>
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = await params

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Container className="py-8">
          <h1 className="mb-8 text-2xl font-bold">종목 분석 #{id}</h1>

          {/* 지표 요약 섹션 - 구현 예정 (F002, F005, F006, F010) */}
          <section className="bg-muted/50 mb-6 rounded-lg border p-8 text-center">
            <p className="text-muted-foreground text-sm">
              지표 요약 카드 구현 예정 (현재 종가 / MA13 / YoY / 52주 최고가 /
              52주 최저가)
            </p>
          </section>

          {/* 주가 + MA13 차트 - 구현 예정 (F007) */}
          <section className="bg-muted/50 mb-6 rounded-lg border p-8 text-center">
            <p className="text-muted-foreground text-sm">
              주가 + MA13 차트 구현 예정 (F007)
            </p>
          </section>

          {/* Google Trends 차트 - 구현 예정 (F008) */}
          <section className="bg-muted/50 mb-6 rounded-lg border p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Google Trends 차트 구현 예정 (F008)
            </p>
          </section>

          {/* 주가 vs 트렌드 비교 차트 - 구현 예정 (F009) */}
          <section className="bg-muted/50 mb-6 rounded-lg border p-8 text-center">
            <p className="text-muted-foreground text-sm">
              주가 vs 트렌드 비교 차트 구현 예정 (F009)
            </p>
          </section>

          {/* 다운로드 섹션 - 구현 예정 (F011, F012) */}
          <section className="bg-muted/50 rounded-lg border p-8 text-center">
            <p className="text-muted-foreground text-sm">
              엑셀/PNG 다운로드 구현 예정 (F011, F012)
            </p>
          </section>
        </Container>
      </main>
    </div>
  )
}
