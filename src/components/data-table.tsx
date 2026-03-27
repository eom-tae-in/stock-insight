'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  }>({ key: 'date', direction: 'desc' })

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

  // 페이지네이션
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedData = sortedData.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  )

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
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
      className="flex items-center gap-1 font-semibold transition-colors hover:text-blue-500"
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
          <thead className="bg-muted/70 border-b">
            <tr>
              <th className="border-muted/60 border-r px-4 py-3 text-left">
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
            {paginatedData.map((row, index) => (
              <tr
                key={`${row.date}-${index}`}
                className="hover:bg-muted/30 border-b transition-colors"
              >
                <td className="border-muted/60 border-r px-4 py-3 font-medium">
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

      {/* 페이지네이션 */}
      <div className="bg-card flex items-center justify-between rounded-lg border p-4">
        <div className="text-muted-foreground text-sm">
          총 {sortedData.length}개 항목 | {currentPage} / {totalPages} 페이지
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage(prev => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
