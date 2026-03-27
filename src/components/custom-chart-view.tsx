'use client'

import { useState, useEffect } from 'react'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UnifiedChart } from '@/components/unified-chart'
import type {
  CustomChart,
  PriceDataPoint,
  TrendsDataPoint,
  Metrics,
} from '@/types'

interface CustomChartViewProps {
  searchId: string
  priceData: PriceDataPoint[]
  trendsData: TrendsDataPoint[]
  ma13?: (number | null)[]
  metrics: Metrics
}

export function CustomChartView({
  searchId,
  priceData,
  trendsData,
  ma13,
  metrics,
}: CustomChartViewProps) {
  const [customCharts, setCustomCharts] = useState<CustomChart[]>([])
  const [expandedChartId, setExpandedChartId] = useState<string | null>(null)

  // localStorage에서 커스텀 차트 로드
  useEffect(() => {
    const storageKey = `stock-custom-charts-${searchId}`
    const savedData = localStorage.getItem(storageKey)
    if (savedData) {
      try {
        const charts = JSON.parse(savedData)
        setCustomCharts(charts)
        // 첫 번째 차트를 기본으로 확장
        if (charts.length > 0) {
          setExpandedChartId(charts[0].id)
        }
      } catch (error) {
        console.error('Failed to load custom charts:', error)
      }
    }
  }, [searchId])

  // 차트 삭제
  const deleteChart = (chartId: string) => {
    if (!confirm('이 차트를 삭제하시겠습니까?')) return

    const storageKey = `stock-custom-charts-${searchId}`
    const updated = customCharts.filter(c => c.id !== chartId)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    setCustomCharts(updated)
  }

  if (customCharts.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">저장된 커스텀 차트</h3>

      {customCharts.map(chart => {
        const isExpanded = expandedChartId === chart.id

        return (
          <div
            key={chart.id}
            className="bg-card overflow-hidden rounded-lg border"
          >
            {/* 차트 헤더 (토글 버튼) */}
            <button
              onClick={() => setExpandedChartId(isExpanded ? null : chart.id)}
              className="hover:bg-muted/50 flex w-full items-center justify-between p-4 transition-colors"
            >
              <div className="flex-1 text-left">
                <h4 className="font-semibold">{chart.name}</h4>
                <p className="text-muted-foreground mt-1 text-xs">
                  {chart.series
                    .map(key => {
                      const seriesMap: Record<string, string> = {
                        close: '종가',
                        ma13: '13주 MA',
                        week52High: '52주 최고가',
                        week52Low: '52주 최저가',
                        trends: '검색 관심도',
                        yoy: '52주 YoY',
                      }
                      return seriesMap[key] || key
                    })
                    .join(' · ')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation()
                    deleteChart(chart.id)
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

            {/* 차트 렌더링 */}
            {isExpanded && (
              <div className="border-t p-4">
                <div className="bg-card rounded-lg border p-4">
                  <div className="text-muted-foreground mb-4 text-xs">
                    표시 중인 시리즈:{' '}
                    {chart.series
                      .map(key => {
                        const seriesMap: Record<string, string> = {
                          close: '종가',
                          ma13: '13주 MA',
                          week52High: '52주 최고가',
                          week52Low: '52주 최저가',
                          trends: '검색 관심도',
                          yoy: '52주 YoY',
                        }
                        return seriesMap[key] || key
                      })
                      .join(', ')}
                  </div>

                  <UnifiedChart
                    priceData={priceData}
                    trendsData={trendsData}
                    ma13={ma13}
                    metrics={metrics}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
