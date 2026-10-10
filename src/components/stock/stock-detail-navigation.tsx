import Link from 'next/link'
import { ArrowLeft, ChartNoAxesCombined, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function StockDetailNavigation() {
  return (
    <nav
      aria-label="종목 상세 이동"
      className="mb-6 flex flex-wrap items-center justify-between gap-2"
    >
      <Button asChild variant="ghost" size="mobile">
        <Link href="/stock-analysis">
          <ArrowLeft aria-hidden className="size-4" />
          관심 종목 목록
        </Link>
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="mobile">
          <a href="#stock-price-chart">
            <ChartNoAxesCombined aria-hidden className="size-4" />
            가격 차트
          </a>
        </Button>
        <Button asChild variant="ghost" size="mobile">
          <a href="#stock-weekly-data">
            <Table2 aria-hidden className="size-4" />
            주간 데이터
          </a>
        </Button>
      </div>
    </nav>
  )
}
