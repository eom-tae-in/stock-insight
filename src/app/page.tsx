'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { StockCard } from '@/components/stock-card'
import { getMockSearchRecords } from '@/lib/mock-data'

export default function DashboardPage() {
  const [records, setRecords] = useState(() => getMockSearchRecords())

  const handleRefresh = async (id: string) => {
    // Phase 3: 실제 API 호출로 교체 예정
    console.log('Refresh:', id)
  }

  const handleDelete = async (id: string) => {
    // Phase 3: 실제 API 호출로 교체 예정
    setRecords(records.filter(r => r.id !== id))
  }

  const isEmpty = records.length === 0

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-24">
        <Container className="py-8">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold">저장된 종목</h1>
          </div>

          {isEmpty ? (
            /* 빈 상태 UI */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-muted-foreground mb-6 text-lg">
                저장된 종목이 없습니다.
              </p>
              <Button asChild>
                <Link href="/search">+ 추가</Link>
              </Button>
            </div>
          ) : (
            /* 종목 카드 그리드 */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {records.map(record => (
                <StockCard
                  key={record.id}
                  id={record.id}
                  ticker={record.ticker}
                  companyName={record.company_name}
                  currentPrice={record.current_price}
                  yoyChange={record.yoy_change}
                  sparklineData={record.price_data}
                  onRefresh={() => handleRefresh(record.id)}
                  onDelete={() => handleDelete(record.id)}
                />
              ))}
            </div>
          )}
        </Container>
      </main>

      {/* 하단 고정 추가 버튼 */}
      {!isEmpty && (
        <div className="fixed right-6 bottom-6">
          <Button size="lg" className="rounded-full shadow-lg" asChild>
            <Link href="/search">+ 추가</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
