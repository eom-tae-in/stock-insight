'use client'
import { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import type { ShellData } from '@/lib/app-shell'
import { useStockOrder } from '@/hooks/use-stock-order'
import { Button } from '@/components/ui/button'
import { ChangeText } from '@/components/shared/change-badge'

const stocks = [
  { id: 'nvda', ticker: 'NVDA', change: 2.35 },
  { id: 'pltr', ticker: 'PLTR', change: 4.62 },
  { id: 'tsm', ticker: 'TSM', change: 1.12 },
  { id: 'lly', ticker: 'LLY', change: 0.57 },
  { id: 'msft', ticker: 'MSFT', change: -0.32 },
  { id: 'aapl', ticker: 'AAPL', change: 0 },
] as const
const data: ShellData = {
  stocks,
  keywords: [
    { id: 'ai', label: 'AI 반도체' },
    { id: 'robot', label: '로봇 택시' },
  ],
  isAdmin: false,
  week: '2026년 40주차',
  weekRange: '09.28 – 10.02',
  nextWeek: '10.12(월) 이후',
  staleCount: 3,
}
export function ShellShowcase() {
  const [detail, setDetail] = useState(false)
  const [empty, setEmpty] = useState(false)
  const [admin, setAdmin] = useState(false)
  const { ordered, saveOrder } = useStockOrder(stocks)
  return (
    <AppShell
      data={{
        ...data,
        stocks: empty ? [] : stocks,
        keywords: empty ? [] : data.keywords,
        staleCount: empty ? 0 : 3,
        isAdmin: admin,
      }}
      profile={{ name: '샘플 사용자', email: 'demo@example.test' }}
      pathnameOverride={detail ? '/stock-analysis/nvda' : '/'}
    >
      <div className="space-y-6">
        <div>
          <p className="text-brand-text text-xs">
            2026년 40주차 · 09.28 – 10.02 완료 주 기준
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            {detail ? 'NVDA' : '앱 셸 미리보기'}
          </h1>
          <p className="text-text-secondary mt-2 text-[13px]">
            개발 전용 고정 데이터예요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => setDetail(value => !value)}
          >
            상세 화면 전환
          </Button>
          <Button variant="secondary" onClick={() => setEmpty(value => !value)}>
            빈 목록 전환
          </Button>
          <Button variant="secondary" onClick={() => setAdmin(value => !value)}>
            관리자 표시 전환
          </Button>
          <Button
            variant="secondary"
            onClick={() => saveOrder([...ordered].reverse())}
          >
            종목 순서 뒤집기
          </Button>
        </div>
        <section className="bg-card rounded-lg border p-6">
          <h2 className="text-base font-semibold">관심 종목 순서</h2>
          <p className="text-text-secondary mt-2 text-[13px]">
            이 기기(브라우저)에 저장돼요.
          </p>
          <ol data-qa="stock-order" className="mt-4 space-y-2">
            {(empty ? [] : ordered).map(stock => (
              <li
                key={stock.id}
                className="border-border-subtle flex min-h-11 items-center justify-between border-b text-sm"
              >
                <span>{stock.ticker}</span>
                <ChangeText value={stock.change} />
              </li>
            ))}
          </ol>
        </section>
        <section className="bg-card rounded-lg border p-6">
          <h2 className="text-base font-semibold">본문 영역</h2>
          <p className="text-text-secondary mt-2 text-[13px]">
            현재 페이지 내용은 유지하고 탐색 영역을 재구성했어요.
          </p>
          <div className="min-h-[360px]" />
        </section>
      </div>
    </AppShell>
  )
}
