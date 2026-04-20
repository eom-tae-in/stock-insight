'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { calculateWeeklyYoY } from '@/lib/calculations'
import { formatPrice, getCurrencySymbol } from '@/lib/utils/currency'
import type { PriceDataPoint } from '@/types'

interface DataTableProps {
  ticker: string
  currency?: string
  priceData: PriceDataPoint[]
  ma13Values: (number | null)[]
}

const ITEMS_PER_PAGE = 20

export function DataTable({
  ticker,
  currency,
  priceData,
  ma13Values,
}: DataTableProps) {
  const [loadedCount, setLoadedCount] = useState(ITEMS_PER_PAGE)
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  }>({ key: 'date', direction: 'desc' })
  const [showScrollTop, setShowScrollTop] = useState(false)
  const lastRowRef = useRef<HTMLTableRowElement>(null)

  // 테이블 데이터 구성
  const tableData = useMemo(() => {
    const weeklyYoY = calculateWeeklyYoY(priceData)
    return priceData.map((price, index) => ({
      date: price.date,
      close: price.close,
      ma13: ma13Values[index] ?? 0,
      yoy: weeklyYoY[index] ?? 0,
    }))
  }, [priceData, ma13Values])

  // 정렬
  const sortedData = useMemo(() => {
    const sorted = [...tableData]
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof typeof a]
      const bVal = b[sortConfig.key as keyof typeof b]

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      const aNum = typeof aVal === 'number' ? aVal : 0
      const bNum = typeof bVal === 'number' ? bVal : 0

      return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum
    })
    return sorted
  }, [tableData, sortConfig])

  // 무한 스크롤 - Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && loadedCount < sortedData.length) {
          setLoadedCount(prev =>
            Math.min(prev + ITEMS_PER_PAGE, sortedData.length)
          )
        }
      },
      { threshold: 0.1 }
    )

    if (lastRowRef.current) {
      observer.observe(lastRowRef.current)
    }

    return () => observer.disconnect()
  }, [loadedCount, sortedData])

  // 스크롤 위치 감지 - 맨 위로 가기 버튼 표시/숨김
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 맨 위로 스크롤
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 표시할 데이터
  const displayedData = sortedData.slice(0, loadedCount)

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
    setLoadedCount(ITEMS_PER_PAGE)
  }

  const SortHeader = ({
    label,
    sortKey,
  }: {
    label: string
    sortKey: string
  }) => (
    <button
      onClick={() => handleSort(sortKey)}
      className="flex items-center justify-center gap-1 font-semibold transition-colors hover:text-blue-500"
    >
      {label}
      {sortConfig.key === sortKey && (
        <span className="text-xs">
          {sortConfig.direction === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  )

  // 정렬 상태 텍스트 생성
  const getSortStatusText = () => {
    const labelMap: { [key: string]: string } = {
      date: '일정',
      close: '주가',
      ma13: '13주 MA',
      yoy: '전년도 대비',
    }

    const label = labelMap[sortConfig.key] || '일정'
    const direction = sortConfig.direction === 'asc' ? '오름차순' : '내림차순'

    return `현재 ${label} 기준 ${direction}으로 정렬되어 있습니다`
  }

  return (
    <div className="space-y-4">
      {/* 정렬 상태 설명 */}
      <div className="text-muted-foreground text-sm">{getSortStatusText()}</div>

      {/* 테이블 */}
      <div className="bg-card overflow-x-auto rounded-lg border">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="border-muted/60 border-r px-4 py-3">
                <div className="flex items-center justify-center">
                  <SortHeader label="일정" sortKey="date" />
                </div>
              </th>
              <th className="border-muted/60 border-r px-4 py-3">
                <div className="flex items-center justify-center">
                  <SortHeader
                    label={`주가 (${getCurrencySymbol(currency || ticker)})`}
                    sortKey="close"
                  />
                </div>
              </th>
              <th className="border-muted/60 border-r px-4 py-3">
                <div className="flex items-center justify-center">
                  <SortHeader
                    label={`13주 MA (${getCurrencySymbol(currency || ticker)})`}
                    sortKey="ma13"
                  />
                </div>
              </th>
              <th className="px-4 py-3">
                <div className="flex items-center justify-center">
                  <SortHeader label="전년도 대비 (%)" sortKey="yoy" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedData.map((row, index) => (
              <tr
                key={`${row.date}-${index}`}
                className="hover:bg-muted/30 border-b transition-colors"
                ref={index === displayedData.length - 1 ? lastRowRef : null}
              >
                <td className="border-muted/60 border-r px-4 py-3">
                  <div className="text-center font-medium">{row.date}</div>
                </td>
                <td className="border-muted/60 border-r px-4 py-3">
                  <div className="text-center">
                    {formatPrice(row.close, currency || ticker)}
                  </div>
                </td>
                <td className="border-muted/60 border-r px-4 py-3">
                  <div className="text-center">
                    {formatPrice(row.ma13, currency || ticker)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div
                    className={cn(
                      'text-center font-semibold',
                      row.yoy >= 0
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {row.yoy >= 0 ? '+' : ''}
                    {row.yoy.toFixed(2)}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 로딩 상태 */}
      {loadedCount < sortedData.length && (
        <div className="flex justify-center py-4">
          <div className="text-muted-foreground text-sm">
            스크롤하여 더 보기... ({loadedCount} / {sortedData.length})
          </div>
        </div>
      )}

      {/* 모든 데이터 로드됨 */}
      {loadedCount >= sortedData.length && displayedData.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="text-muted-foreground text-sm">
            총 {sortedData.length}개 항목
          </div>
        </div>
      )}

      {/* 맨 위로 가기 버튼 */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed right-6 bottom-6 rounded-full shadow-lg transition-all hover:shadow-xl"
          aria-label="맨 위로 이동"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
