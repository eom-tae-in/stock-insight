'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Trash2, RefreshCw, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { KeywordSearchRecord } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KeywordStandaloneChart } from './keyword-standalone-chart'

interface KeywordDetailClientProps {
  keyword: KeywordSearchRecord
  chartData: Array<{
    weekIndex: number
    date: string
    trendsValue: number
    ma13Value: number | null
    yoyValue: number | null
  }>
  overlays: Array<{
    id: string
    ticker: string
    companyName: string
    displayOrder: number
    chartData: Array<{
      date: string
      normalizedPrice: number
      rawPrice: number
    }>
  }>
}

// 드래그 가능한 카드 컴포넌트
function SortableOverlayCard({
  overlay,
  chartData,
  mergeChartData,
  deletingId,
  onDelete,
  formattedDate,
}: {
  overlay: KeywordDetailClientProps['overlays'][0]
  chartData: KeywordDetailClientProps['chartData']
  mergeChartData: (
    a: KeywordDetailClientProps['chartData'],
    b: KeywordDetailClientProps['overlays'][0]['chartData']
  ) => Array<{
    date: string
    trendsValue: number | null
    ma13Value: number | null
    normalizedPrice: number
    yoyValue: number | null
  }>
  deletingId: string | null
  onDelete: (id: string) => void
  formattedDate: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: overlay.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const mergedData = mergeChartData(chartData, overlay.chartData)

  return (
    <Link href={`/keywords/${overlay.id}/overlay`} className="group relative">
      <Card
        ref={setNodeRef}
        style={style}
        className="flex h-full cursor-pointer flex-col transition-all hover:shadow-lg"
      >
        {/* 드래그 핸들 */}
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:bg-muted absolute top-2 left-2 z-20 h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
          {...attributes}
          {...listeners}
          aria-label="드래그"
        >
          <GripVertical className="h-4 w-4" />
        </Button>

        {/* 호버 시 삭제 버튼 */}
        <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/15 h-7 w-7 p-0"
            onClick={() => onDelete(overlay.id)}
            disabled={deletingId === overlay.id}
            aria-label="삭제"
          >
            {deletingId === overlay.id ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        <CardHeader className="pb-3 pl-8">
          <CardTitle className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">{overlay.ticker}</p>
              <p className="text-muted-foreground text-xs font-normal">
                {overlay.companyName}
              </p>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col">
          {/* 4개 라인 차트 */}
          {mergedData.length > 0 ? (
            <div className="mb-4 flex-1">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={mergedData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={false}
                    axisLine={false}
                    height={0}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '6px 8px',
                    }}
                  />
                  {/* 라인1: 13주 이동평균 (주황색) */}
                  <Line
                    type="monotone"
                    dataKey="ma13Value"
                    stroke="hsl(38 92% 50%)"
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                    name="13주 이동평균"
                  />
                  {/* 라인2: 52주 YoY (분홍색) */}
                  <Line
                    type="monotone"
                    dataKey="yoyValue"
                    stroke="hsl(289 100% 58%)"
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                    name="52주 YoY"
                  />
                  {/* 라인3: 종목 주가 (초록색) - ticker 포함 */}
                  <Line
                    type="monotone"
                    dataKey="normalizedPrice"
                    stroke="hsl(142 72% 29%)"
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                    name={`${overlay.ticker} 주가`}
                  />
                  {/* 라인4: 트렌드 지수 (파란색) */}
                  <Line
                    type="monotone"
                    dataKey="trendsValue"
                    stroke="hsl(211 100% 50%)"
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                    name="트렌드 지수"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-muted-foreground bg-muted flex items-center justify-center rounded py-8 text-sm">
              데이터 없음
            </div>
          )}

          {/* 메타정보: 좌하 + 우하 */}
          <div className="text-muted-foreground flex items-center justify-between border-t pt-3 text-xs">
            <span>1년치 차트</span>
            <span>{formattedDate}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function KeywordDetailClient({
  keyword,
  chartData,
  overlays: initialOverlays,
}: KeywordDetailClientProps) {
  const [overlays, setOverlays] = useState(initialOverlays)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 차트 데이터 병합 (date 기준, 1년치=52주)
  const mergeChartData = (
    keywordData: typeof chartData,
    overlayData: (typeof initialOverlays)[0]['chartData']
  ) => {
    const keywordMap = new Map(keywordData.map(d => [d.date, d]))
    const merged = overlayData.map(point => ({
      date: point.date,
      trendsValue: keywordMap.get(point.date)?.trendsValue ?? null,
      ma13Value: keywordMap.get(point.date)?.ma13Value ?? null,
      normalizedPrice: point.normalizedPrice,
      yoyValue: keywordMap.get(point.date)?.yoyValue ?? null,
    }))
    // 마지막 52개만 (1년)
    return merged.slice(Math.max(0, merged.length - 52))
  }

  const handleDelete = async (overlayId: string) => {
    setDeletingId(overlayId)
    try {
      const res = await fetch(
        `/api/keyword-searches/${keyword.id}/overlays/${overlayId}`,
        { method: 'DELETE' }
      )

      if (!res.ok) throw new Error('Delete failed')

      setOverlays(prev => prev.filter(o => o.id !== overlayId))
      toast.success('종목이 삭제되었습니다')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('삭제에 실패했습니다')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = overlays.findIndex(o => o.id === active.id)
      const newIndex = overlays.findIndex(o => o.id === over.id)

      const newOrder = arrayMove(overlays, oldIndex, newIndex)
      setOverlays(newOrder)

      // API 호출로 순서 저장
      try {
        const res = await fetch(
          `/api/keyword-searches/${keyword.id}/overlays`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderedIds: newOrder.map(o => o.id),
            }),
          }
        )

        if (!res.ok) throw new Error('Order update failed')
        toast.success('순서가 저장되었습니다')
      } catch (error) {
        console.error('Order update error:', error)
        toast.error('순서 저장에 실패했습니다')
        setOverlays(initialOverlays)
      }
    }
  }

  const formattedDate = new Date(keyword.searched_at).toLocaleDateString(
    'ko-KR',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  )

  return (
    <div className="bg-background min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        {/* 헤더 */}
        <div className="mb-6">
          <Link
            href="/trends"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            ← 내 키워드로 돌아가기
          </Link>
        </div>

        {/* 섹션1: 현재 키워드 차트(단독) */}
        <div className="mb-12">
          <KeywordStandaloneChart
            keyword={keyword.keyword}
            chartData={chartData}
            formattedDate={formattedDate}
          />
        </div>

        {/* 구분선 */}
        <div className="border-border my-12 border-t" />

        {/* 섹션2: 해당 키워드 커스텀 차트 목록 */}
        <div>
          <h1 className="mb-2 text-3xl font-bold">
            {keyword.keyword} 키워드 커스텀 목록
          </h1>
          <p className="text-muted-foreground mb-8 text-sm">
            {chartData.length > 0
              ? `${chartData[0].date} ~ ${chartData[chartData.length - 1].date} (${chartData.length}주)`
              : '데이터 없음'}
            • 오버레이 {overlays.length}개
          </p>

          {/* 오버레이 그리드 */}
          {overlays.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={overlays.map(o => o.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {overlays.map(overlay => (
                    <SortableOverlayCard
                      key={overlay.id}
                      overlay={overlay}
                      chartData={chartData}
                      mergeChartData={mergeChartData}
                      deletingId={deletingId}
                      onDelete={handleDelete}
                      formattedDate={formattedDate}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground text-sm">
                  추가된 종목이 없습니다
                </p>
              </CardContent>
            </Card>
          )}

          {/* 데이터 정보 */}
          <div className="mt-12 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 dark:border-amber-800 dark:from-amber-950/20 dark:to-orange-950/20">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
              <span className="text-lg">📊</span>이 페이지의 데이터
            </h3>
            <ul className="space-y-2 text-xs text-amber-800 dark:text-amber-200">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-bold text-green-500">✓</span>
                <span>
                  상단 차트는 키워드의 트렌드 데이터만 표시합니다 (5년 전체)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-bold text-green-500">✓</span>
                <span>
                  하단 카드는 키워드 + 종목 조합의 정확한 시계열 데이터입니다
                  (1년치 = 52주)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-bold text-green-500">✓</span>
                <span>
                  각 카드는 4개 라인으로 구성:{' '}
                  <span className="font-medium">13주 이동평균</span>(주황색),{' '}
                  <span className="font-medium">52주 YoY</span>(분홍색),{' '}
                  <span className="font-medium">AAPL/TSLA 등 종목 주가</span>
                  (초록색), <span className="font-medium">트렌드 지수</span>
                  (파란색)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-bold text-green-500">✓</span>
                <span>드래그로 카드 순서를 변경할 수 있습니다</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
