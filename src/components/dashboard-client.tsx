/**
 * Task 013: 대시보드 Client Component
 *
 * Server Component에서 초기 데이터를 받아
 * 상호작용 (삭제, 새로고침) 처리
 */

'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { StockCard } from '@/components/stock-card'
import { Edit2, Check } from 'lucide-react'
import type { SearchRecord } from '@/types'

interface DashboardClientProps {
  initialRecords: SearchRecord[]
}

const SORT_ORDER_KEY = 'stock-sort-order'

export function DashboardClient({ initialRecords }: DashboardClientProps) {
  const [records, setRecords] = useState(initialRecords)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [isEditMode, setIsEditMode] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  // 저장된 순서 복원 (초기 로딩 시에만)
  useEffect(() => {
    const savedOrder = localStorage.getItem(SORT_ORDER_KEY)
    if (savedOrder) {
      try {
        const orderMap = JSON.parse(savedOrder) as Record<string, number>
        const sorted = [...initialRecords].sort((a, b) => {
          const orderA = orderMap[a.id] ?? Infinity
          const orderB = orderMap[b.id] ?? Infinity
          return orderA - orderB
        })
        setRecords(sorted)
      } catch (error) {
        console.error('Failed to restore sort order:', error)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 순서 저장
  const saveOrder = (newRecords: SearchRecord[]) => {
    const orderMap: Record<string, number> = {}
    newRecords.forEach((record, index) => {
      orderMap[record.id] = index
    })
    localStorage.setItem(SORT_ORDER_KEY, JSON.stringify(orderMap))
  }

  // 드래그 시작
  const handleDragStart = (id: string) => {
    setDraggedId(id)
  }

  // 드래그 오버
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // 드롭
  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return

    const draggedIndex = records.findIndex(r => r.id === draggedId)
    const targetIndex = records.findIndex(r => r.id === targetId)

    const newRecords = [...records]
    ;[newRecords[draggedIndex], newRecords[targetIndex]] = [
      newRecords[targetIndex],
      newRecords[draggedIndex],
    ]

    setRecords(newRecords)
    saveOrder(newRecords)
    setDraggedId(null)
  }

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
        const allData = (await getAllResponse.json()) as {
          data?: SearchRecord[]
        }
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
        <>
          {/* 수정 모드 토글 버튼 */}
          <div className="mb-6 flex justify-end">
            <Button
              variant={isEditMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  완료
                </>
              ) : (
                <>
                  <Edit2 className="mr-2 h-4 w-4" />
                  수정
                </>
              )}
            </Button>
          </div>

          {/* 수정 모드 안내 */}
          {isEditMode && (
            <div className="mb-4 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-400">
              💡 카드를 드래그해서 순서를 변경할 수 있습니다
            </div>
          )}

          {/* 종목 카드 그리드 - 한 줄에 3개씩 표시 */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {records.map(record => (
              <div
                key={record.id}
                draggable={isEditMode}
                onDragStart={() => handleDragStart(record.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(record.id)}
                className={
                  isEditMode
                    ? 'cursor-move opacity-100 transition-opacity hover:opacity-80'
                    : ''
                }
              >
                <StockCard
                  id={record.id}
                  ticker={record.ticker}
                  companyName={record.company_name}
                  currentPrice={record.current_price}
                  previousClose={record.previous_close}
                  yoyChange={record.yoy_change}
                  sparklineData={record.price_data}
                  onRefresh={() => handleRefresh(record.id)}
                  onDelete={() => handleDelete(record.id)}
                  isLoading={loadingIds.has(record.id)}
                  isEditMode={isEditMode}
                  isDragging={draggedId === record.id}
                />
              </div>
            ))}
          </div>
        </>
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
