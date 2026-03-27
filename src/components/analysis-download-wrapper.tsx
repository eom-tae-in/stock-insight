'use client'

import { useRef, useState } from 'react'
import { UnifiedChart } from '@/components/unified-chart'
import { DownloadSection } from '@/components/download-section'
import { captureChartAsPng } from '@/lib/export'
import { toast } from 'sonner'
import type { PriceDataPoint, TrendsDataPoint, Metrics } from '@/types/database'

interface AnalysisDownloadWrapperProps {
  ticker: string
  priceData: PriceDataPoint[]
  trendsData: TrendsDataPoint[]
  ma13Values: (number | null)[]
  metrics: Metrics
}

/**
 * UnifiedChart + DownloadSection을 포함하는 Client Component
 * 전체 차트 PNG 다운로드 기능을 관리합니다.
 */
export function AnalysisDownloadWrapper({
  ticker,
  priceData,
  trendsData,
  ma13Values,
  metrics,
}: AnalysisDownloadWrapperProps) {
  const chartSectionRef = useRef<HTMLDivElement>(null)
  const [isPngAllLoading, setIsPngAllLoading] = useState(false)

  const handleDownloadAllCharts = async () => {
    if (!chartSectionRef.current) {
      toast.error('차트를 찾을 수 없습니다.')
      return
    }

    try {
      setIsPngAllLoading(true)
      await captureChartAsPng(chartSectionRef.current, {
        ticker,
        chartName: 'all-charts',
      })
      toast.success('전체 차트가 PNG로 다운로드되었습니다.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '차트 다운로드에 실패했습니다.'
      toast.error(message)
    } finally {
      setIsPngAllLoading(false)
    }
  }

  return (
    <>
      {/* 차트 섹션 (전체 캡처용) */}
      <div ref={chartSectionRef}>
        <section className="mb-8">
          <UnifiedChart
            ticker={ticker}
            priceData={priceData}
            trendsData={trendsData}
            ma13={ma13Values}
            metrics={metrics}
          />
        </section>
      </div>

      {/* 다운로드 섹션 (전체 PNG 버튼과 연결) */}
      <DownloadSection
        ticker={ticker}
        priceData={priceData}
        trendsData={trendsData}
        ma13Values={ma13Values}
        metrics={metrics}
        onDownloadAllCharts={handleDownloadAllCharts}
        isPngAllLoading={isPngAllLoading}
      />
    </>
  )
}
