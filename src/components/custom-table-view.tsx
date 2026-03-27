'use client'

import { useState, useEffect } from 'react'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CustomTable, PriceDataPoint, TrendsDataPoint } from '@/types'

interface CustomTableViewProps {
  searchId: string
  priceData: PriceDataPoint[]
  trendsData: TrendsDataPoint[]
  ma13?: (number | null)[]
  yoyChange?: number
}

export function CustomTableView({
  searchId,
  priceData,
  trendsData,
  ma13,
  yoyChange,
}: CustomTableViewProps) {
  const [customTables, setCustomTables] = useState<CustomTable[]>([])
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null)

  // localStorage에서 커스텀 테이블 로드
  useEffect(() => {
    const storageKey = `stock-custom-tables-${searchId}`
    const savedData = localStorage.getItem(storageKey)
    if (savedData) {
      try {
        const tables = JSON.parse(savedData)
        setCustomTables(tables)
      } catch (error) {
        console.error('Failed to load custom tables:', error)
      }
    }
  }, [searchId])

  // 테이블 삭제
  const deleteTable = (tableId: string) => {
    if (!confirm('이 테이블을 삭제하시겠습니까?')) return

    const storageKey = `stock-custom-tables-${searchId}`
    const updated = customTables.filter(t => t.id !== tableId)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    setCustomTables(updated)
  }

  // 테이블 데이터 생성
  const buildTableData = (table: CustomTable) => {
    const trendsMap = new Map<string, number>()
    for (const point of trendsData) {
      trendsMap.set(point.date, point.value)
    }

    return priceData.map((point, index) => {
      const row: Record<string, string | number> = {
        date: new Date(point.date).toLocaleDateString('ko-KR'),
      }

      if (table.columns.includes('close')) {
        row.close = `$${point.close.toFixed(2)}`
      }

      if (table.columns.includes('ma13')) {
        row.ma13 = ma13?.[index]
          ? `$${(ma13[index] as number).toFixed(2)}`
          : '-'
      }

      if (table.columns.includes('trends')) {
        row.trends = trendsMap.get(point.date)?.toFixed(1) ?? '-'
      }

      if (table.columns.includes('yoy')) {
        // 간단히 전체 YoY 값을 모든 행에 표시 (주별 계산은 별도 함수로 가능)
        row.yoy = yoyChange ? `${yoyChange.toFixed(2)}%` : '-'
      }

      return row
    })
  }

  if (customTables.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">저장된 커스텀 테이블</h3>

      {customTables.map(table => {
        const tableData = buildTableData(table)
        const isExpanded = expandedTableId === table.id

        return (
          <div
            key={table.id}
            className="bg-card overflow-hidden rounded-lg border"
          >
            {/* 테이블 헤더 (토글 버튼) */}
            <button
              onClick={() => setExpandedTableId(isExpanded ? null : table.id)}
              className="hover:bg-muted/50 flex w-full items-center justify-between p-4 transition-colors"
            >
              <div className="flex-1 text-left">
                <h4 className="font-semibold">{table.name}</h4>
                <p className="text-muted-foreground mt-1 text-xs">
                  {table.columns
                    .map(col => {
                      const colMap: Record<string, string> = {
                        date: '날짜',
                        close: '종가',
                        ma13: '13주 MA',
                        trends: '검색 관심도',
                        yoy: 'YoY',
                      }
                      return colMap[col] || col
                    })
                    .join(' · ')}{' '}
                  | {tableData.length}개 항목
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation()
                    deleteTable(table.id)
                  }}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                {isExpanded ? (
                  <ChevronUp className="text-muted-foreground h-5 w-5" />
                ) : (
                  <ChevronDown className="text-muted-foreground h-5 w-5" />
                )}
              </div>
            </button>

            {/* 테이블 데이터 */}
            {isExpanded && (
              <div className="overflow-x-auto border-t">
                <table className="w-full text-sm">
                  {/* 헤더 */}
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      {['date', ...table.columns.filter(c => c !== 'date')].map(
                        col => {
                          const colMap: Record<string, string> = {
                            date: '날짜',
                            close: '종가',
                            ma13: '13주 MA',
                            trends: '검색 관심도',
                            yoy: 'YoY',
                          }
                          return (
                            <th
                              key={col}
                              className="text-muted-foreground px-4 py-2 text-left font-semibold"
                            >
                              {colMap[col]}
                            </th>
                          )
                        }
                      )}
                    </tr>
                  </thead>

                  {/* 바디 */}
                  <tbody className="divide-y">
                    {tableData
                      .slice()
                      .reverse()
                      .map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          {[
                            'date',
                            ...table.columns.filter(c => c !== 'date'),
                          ].map(col => (
                            <td key={col} className="px-4 py-2">
                              {String(row[col] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
