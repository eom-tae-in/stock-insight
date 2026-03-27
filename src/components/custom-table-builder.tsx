'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { CustomTable, CustomTableBuilderProps } from '@/types'

const AVAILABLE_COLUMNS = [
  { key: 'close', label: '종가 ($)', required: false },
  { key: 'ma13', label: '13주 MA ($)', required: false },
  { key: 'week52High', label: '52주 최고가 ($)', required: false },
  { key: 'week52Low', label: '52주 최저가 ($)', required: false },
  { key: 'trends', label: '검색 관심도', required: false },
  { key: 'yoy', label: '전년도 대비 (%)', required: false },
]

export function CustomTableBuilder({
  searchId,
  onTableCreated,
}: CustomTableBuilderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tableName, setTableName] = useState('')
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'close',
    'trends',
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleColumn = (columnKey: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(c => c !== columnKey)
        : [...prev, columnKey]
    )
  }

  const handleSave = async () => {
    if (!tableName.trim()) {
      alert('테이블 이름을 입력해주세요')
      return
    }

    if (selectedColumns.length === 0) {
      alert('최소 1개 이상의 컬럼을 선택해주세요')
      return
    }

    setIsSubmitting(true)

    try {
      // localStorage에서 기존 테이블 목록 조회
      const storageKey = `stock-custom-tables-${searchId}`
      const existingData = localStorage.getItem(storageKey)
      const tables: CustomTable[] = existingData ? JSON.parse(existingData) : []

      // 새 테이블 추가
      const newTable: CustomTable = {
        id: crypto.randomUUID(),
        name: tableName.trim(),
        columns: ['date', ...selectedColumns],
        createdAt: new Date().toISOString(),
      }

      tables.push(newTable)
      localStorage.setItem(storageKey, JSON.stringify(tables))

      // 콜백 호출
      onTableCreated?.(newTable)

      // UI 리셋
      setTableName('')
      setSelectedColumns(['close', 'trends'])
      setIsOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          커스텀 테이블 만들기
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>새 커스텀 테이블</SheetTitle>
          <SheetDescription>
            원하는 컬럼을 선택하여 독립적인 데이터 테이블을 만들세요
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* 테이블 이름 입력 */}
          <div className="space-y-2">
            <Label htmlFor="table-name">테이블 이름 *</Label>
            <Input
              id="table-name"
              placeholder="예: 최근 3개월 가격 추이"
              value={tableName}
              onChange={e => setTableName(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-muted-foreground text-xs">
              이 테이블을 구분하기 위한 이름을 입력하세요
            </p>
          </div>

          {/* 컬럼 선택 */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-semibold">
                포함할 컬럼 선택 *
              </Label>
              <p className="text-muted-foreground text-xs">
                날짜는 자동으로 포함됩니다
              </p>
            </div>

            <div className="space-y-3">
              {AVAILABLE_COLUMNS.map(column => (
                <div key={column.key} className="flex items-center gap-3">
                  <Checkbox
                    id={`col-${column.key}`}
                    checked={selectedColumns.includes(column.key)}
                    onCheckedChange={() => toggleColumn(column.key)}
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor={`col-${column.key}`}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* 미리보기 */}
          {selectedColumns.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground mb-2 text-xs">미리보기:</p>
              <div className="text-sm">
                <code className="bg-muted block overflow-x-auto rounded px-2 py-1">
                  날짜 |{' '}
                  {selectedColumns
                    .map(key => {
                      const col = AVAILABLE_COLUMNS.find(c => c.key === key)
                      return col?.label
                    })
                    .join(' | ')}
                </code>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isSubmitting ||
                !tableName.trim() ||
                selectedColumns.length === 0
              }
              className="flex-1"
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
