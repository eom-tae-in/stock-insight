'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { PriceDataPoint, TrendsDataPoint } from '@/types'

interface DataTableProps {
  priceData: PriceDataPoint[]
  trendsData: TrendsDataPoint[]
  ma13Values: (number | null)[]
  yoyChange: number
}

const ITEMS_PER_PAGE = 20

export function DataTable({
  priceData,
  trendsData,
  ma13Values,
  yoyChange,
}: DataTableProps) {
  const [loadedCount, setLoadedCount] = useState(ITEMS_PER_PAGE)
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  }>({ key: 'date', direction: 'desc' })
  const lastRowRef = useRef<HTMLTableRowElement>(null)

  // 트렌드 데이터 맵 만들기 (날짜 기준)
  const trendsMap = useMemo(() => {
    const map = new Map<string, number>()
    trendsData.forEach(item => {
      map.set(item.date, item.value)
    })
    return map
  }, [trendsData])

  // 테이블 데이터 구성
  const tableData = useMemo(() => {
    return priceData.map((price, index) => ({
      date: price.date,
      close: price.close,
      trends: trendsMap.get(price.date) ?? 0,
      ma13: ma13Values[index] ?? 0,
      yoy: yoyChange,
    }))
  }, [priceData, trendsMap, ma13Values, yoyChange])

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

  return (
    <div className="space-y-4">
      {/* 테이블 */}
      <div className="bg-card overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="border-muted/60 border-r px-4 py-3 text-center">
                <SortHeader label="일정" sortKey="date" />
              </th>
              <th className="border-muted/60 border-r px-4 py-3 text-center">
                <SortHeader label="주가 ($)" sortKey="close" />
              </th>
              <th className="border-muted/60 border-r px-4 py-3 text-center">
                <SortHeader label="Google Trends (0-100)" sortKey="trends" />
              </th>
              <th className="border-muted/60 border-r px-4 py-3 text-center">
                <SortHeader label="13주 MA ($)" sortKey="ma13" />
              </th>
              <th className="px-4 py-3 text-center">
                <SortHeader label="전년도 대비 (%)" sortKey="yoy" />
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
                <td className="border-muted/60 border-r px-4 py-3 text-center font-medium">
                  {row.date}
                </td>
                <td className="border-muted/60 border-r px-4 py-3 text-center">
                  ${row.close.toFixed(2)}
                </td>
                <td className="border-muted/60 border-r px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="bg-muted relative h-6 w-16 overflow-hidden rounded">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${row.trends}%` }}
                      />
                    </div>
                    <span className="w-8 text-center">{row.trends}</span>
                  </div>
                </td>
                <td className="border-muted/60 border-r px-4 py-3 text-center">
                  ${row.ma13.toFixed(2)}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 text-center font-semibold',
                    row.yoy >= 0
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {row.yoy >= 0 ? '+' : ''}
                  {row.yoy.toFixed(2)}%
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
    </div>
  )
}
