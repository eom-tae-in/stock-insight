import { Header } from '@/components/layout/header'
import { Container } from '@/components/layout/container'

export default function SearchPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Container size="sm" className="py-16">
          <div className="mb-8 text-center">
            <h1 className="mb-3 text-3xl font-bold">새 종목 조회</h1>
            <p className="text-muted-foreground">
              특정 종목의 5년 가격 흐름과 대중 검색 관심도를 비교하여 투자
              판단을 지원합니다.
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              예시: AAPL, TSLA, MSFT
            </p>
          </div>

          {/* Ticker 입력 섹션 - 구현 예정 (F001) */}
          <div className="bg-muted/50 rounded-lg border p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Ticker 입력 폼 구현 예정 (F001)
            </p>
          </div>
        </Container>
      </main>
    </div>
  )
}
