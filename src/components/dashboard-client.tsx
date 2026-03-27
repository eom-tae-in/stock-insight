/**
 * Task 013: 대시보드 Client Component
 *
 * Server Component에서 초기 데이터를 받아
 * 상호작용 (삭제, 새로고침) 처리
 */

'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { StockCard } from '@/components/stock-card'
import type { SearchRecord } from '@/types'

interface DashboardClientProps {
  initialRecords: SearchRecord[]
}

export function DashboardClient({ initialRecords }: DashboardClientProps) {
  const [records, setRecords] = useState(initialRecords)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  const handleRefresh = async (id: string) => {
    try {
      setLoadingIds(prev => new Set(prev).add(id))

      // 해당 종목의 ticker 찾기
      const record = records.find(r => r.id === id)
      if (!record) return

      // POST /api/searches로 동일 ticker 재조회 (UPSERT)
      const response = await fetch('/api/searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticker: record.ticker }),
      })

      if (!response.ok) {
        throw new Error('Failed to refresh')
      }

      // 데이터 재조회 (새로고침된 레코드 반영)
      const getAllResponse = await fetch('/api/searches')
      if (getAllResponse.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allData: any = await getAllResponse.json()
        if (allData.data && Array.isArray(allData.data)) {
          setRecords(allData.data)
        }
      }
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setLoadingIds(prev => new Set(prev).add(id))

      const response = await fetch(`/api/searches/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete')
      }

      // 로컬 상태에서 제거
      setRecords(records.filter(r => r.id !== id))
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const isEmpty = records.length === 0

  return (
    <>
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
              isLoading={loadingIds.has(record.id)}
            />
          ))}
        </div>
      )}

      {/* 하단 고정 추가 버튼 */}
      {!isEmpty && (
        <div className="fixed right-6 bottom-6">
          <Button size="lg" className="rounded-full shadow-lg" asChild>
            <Link href="/search">+ 추가</Link>
          </Button>
        </div>
      )}
    </>
  )
}
