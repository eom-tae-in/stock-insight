import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { TrendingUp, Search } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="flex-1">
      <Container className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          {/* 타이틀 */}
          <h1 className="mb-4 text-4xl font-bold">StockInsight</h1>
          <p className="text-muted-foreground mb-12 text-lg">
            주가와 트렌드를 한눈에 비교 분석하는 종목 분석 도구
          </p>

          {/* 메인 기능 카드 */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 종목 분석 카드 */}
            <Link href="/stock-analysis">
              <div className="group cursor-pointer">
                <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-8 transition-all hover:border-blue-500/40 hover:from-blue-500/15 hover:to-blue-500/10 hover:shadow-lg">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-blue-500/20 transition-colors group-hover:bg-blue-500/30">
                    <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="mb-2 text-xl font-semibold">종목 분석</h2>
                  <p className="text-muted-foreground text-sm">
                    저장된 종목 목록과 5년 주가 분석 데이터를 확인합니다.
                  </p>
                </div>
              </div>
            </Link>

            {/* 키워드 분석 카드 */}
            <Link href="/keyword-analysis">
              <div className="group cursor-pointer">
                <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-8 transition-all hover:border-purple-500/40 hover:from-purple-500/15 hover:to-purple-500/10 hover:shadow-lg">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-purple-500/20 transition-colors group-hover:bg-purple-500/30">
                    <Search className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="mb-2 text-xl font-semibold">키워드 분석</h2>
                  <p className="text-muted-foreground text-sm">
                    Google Trends 검색 추이와 주가를 비교 분석합니다.
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* 설명 텍스트 */}
          <div className="text-muted-foreground mt-12 max-w-2xl space-y-3 text-sm">
            <p>
              📊 Yahoo Finance와 Google Trends 데이터를 결합하여 종목의 가격
              흐름과 대중 검색 관심도를 함께 분석합니다.
            </p>
            <p>
              🔍 종목과 키워드를 저장하고 언제든지 최신 데이터를 조회할 수
              있습니다.
            </p>
          </div>
        </div>
      </Container>
    </main>
  )
}
