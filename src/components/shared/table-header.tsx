'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { generateTableExcelFile } from '@/lib/export'

interface TableExcelRow {
  date: string
  close: number
  trends: number
  ma13: number | null
  yoy: number | null
}

interface TableHeaderProps {
  ticker: string
  companyName: string
  tableData: TableExcelRow[]
}

export function TableHeader({
  ticker,
  companyName,
  tableData,
}: TableHeaderProps) {
  const [isExcelLoading, setIsExcelLoading] = useState(false)

  const handleExcelDownload = async () => {
    try {
      setIsExcelLoading(true)
      generateTableExcelFile(ticker, tableData)
      toast.success('엑셀 파일이 다운로드되었습니다.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '파일 생성에 실패했습니다.'
      toast.error(message)
    } finally {
      setIsExcelLoading(false)
    }
  }

  return (
    <div className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold">
          {ticker} - {companyName}
        </h1>
      </div>
      <Button
        onClick={handleExcelDownload}
        disabled={isExcelLoading}
        variant="outline"
        size="sm"
        aria-label="테이블 데이터를 엑셀 파일로 다운로드"
      >
        <Download className="mr-2 h-4 w-4" />
        {isExcelLoading ? '다운로드 중...' : '엑셀 다운로드'}
      </Button>
    </div>
  )
}
