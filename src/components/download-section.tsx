'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { generateExcelFile } from '@/lib/export'
import type { DownloadSectionProps } from '@/types/ui'

export function DownloadSection({
  ticker,
  priceData,
  trendsData,
  ma13Values,
  metrics,
  onDownloadAllCharts,
  isPngAllLoading = false,
}: DownloadSectionProps) {
  const [isExcelLoading, setIsExcelLoading] = useState(false)

  const handleExcelDownload = async () => {
    try {
      setIsExcelLoading(true)
      generateExcelFile({
        ticker,
        priceData,
        trendsData,
        ma13Values,
        metrics,
      })
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
    <section className="bg-card rounded-lg border p-6">
      <h3 className="mb-4 text-lg font-semibold">데이터 다운로드</h3>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleExcelDownload}
          disabled={isExcelLoading}
          variant="outline"
          className="flex-1 sm:flex-none"
          aria-label="엑셀 파일 다운로드"
        >
          <Download className="mr-2 h-4 w-4" />
          {isExcelLoading ? '다운로드 중...' : '엑셀 다운로드'}
        </Button>
        <Button
          onClick={onDownloadAllCharts}
          disabled={!onDownloadAllCharts || isPngAllLoading}
          variant="outline"
          className="flex-1 sm:flex-none"
          aria-label="전체 차트 PNG 다운로드"
        >
          <Download className="mr-2 h-4 w-4" />
          {isPngAllLoading ? 'PNG 다운로드 중...' : '전체 차트 PNG 다운로드'}
        </Button>
      </div>
    </section>
  )
}
