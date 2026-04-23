'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
import { GripVertical, Pencil, RefreshCw, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDndContext,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DragOverlay } from '@dnd-kit/core'
import type {
  KeywordRecord,
  KeywordAnalysis,
  Region,
  Period,
  SearchType,
  TrendsDataPoint,
} from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { generateKeywordAnalysisExcelFile } from '@/lib/export/excel'
import { captureChartAsPng } from '@/lib/export/image'
import { KeywordStandaloneChart } from './keyword-standalone-chart'

// 차트 데이터 포인트 타입
type ChartDataPoint = {
  weekIndex: number
  date: string
  trendsValue: number
  ma13Value: number | null
  yoyValue: number | null
}

// Overlay 타입 정의
type OverlayItem = {
  id: string
  ticker: string
  companyName: string
  displayOrder: number
  lastRefreshedAt?: string | null
  chartData: Array<{
    date: string
    normalizedPrice: number
    rawPrice: number
  }>
}

// 분석 조합 타입
type AnalysisSummary = {
  id: string
  region: Region
  period: Period
  search_type: SearchType
}

// 레이블 매핑
const REGION_LABEL: Record<Region, string> = {
  GLOBAL: '전체',
  US: '미국',
  KR: '한국',
  JP: '일본',
  GB: '영국',
  DE: '독일',
  FR: '프랑스',
  CA: '캐나다',
  AU: '호주',
  IN: '인도',
  BR: '브라질',
  CN: '중국',
  TW: '대만',
  HK: '홍콩',
  SG: '싱가포르',
}

const SEARCH_TYPE_LABEL: Record<SearchType, string> = {
  WEB: '웹 검색',
  IMAGES: '이미지',
  NEWS: '뉴스',
  YOUTUBE: '유튜브',
  SHOPPING: '쇼핑',
}

const PERIOD_MAX_YEARS: Record<Period, number> = {
  '1M': 1,
  '3M': 1,
  '12M': 1,
  '1Y': 1,
  '2Y': 2,
  '3Y': 3,
  '4Y': 4,
  '5Y': 5,
  ALL: 25,
}

function formatDisplayDate(value?: string | null) {
  if (!value) return ''

  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

interface KeywordDetailClientProps {
  keywordId: string
  keyword: KeywordRecord
  initialSearchParams: {
    region: Region
    period: Period
    searchType: SearchType
  }
}

// DragOverlay에서 표시할 컴포넌트
function DragOverlayComponent({
  overlays,
  chartData,
  mergeChartData,
  formattedDate,
}: {
  overlays: OverlayItem[]
  chartData: ChartDataPoint[]
  mergeChartData: (
    a: ChartDataPoint[],
    b: OverlayItem['chartData']
  ) => Array<{
    date: string
    trendsValue: number | null
    ma13Value: number | null
    normalizedPrice: number
    yoyValue: number | null
  }>
  formattedDate: string
}) {
  const { active } = useDndContext()

  if (!active) return null

  const draggedOverlay = overlays.find(o => o.id === active.id)
  if (!draggedOverlay) return null

  const mergedData = mergeChartData(chartData, draggedOverlay.chartData)

  return (
    <DragOverlay>
      <Card className="flex h-96 w-96 flex-col bg-blue-100 shadow-2xl transition-all duration-300 ease-in-out dark:bg-blue-900/30">
        <CardHeader className="pb-3 pl-8">
          <CardTitle className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">{draggedOverlay.ticker}</p>
              <p className="text-muted-foreground text-xs font-normal">
                {draggedOverlay.companyName}
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
                  {/* 라인1: 13주 이동평균(13주 MA) (주황색) */}
                  <Line
                    type="monotone"
                    dataKey="ma13Value"
                    stroke="hsl(38 92% 50%)"
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                    name="13주 이동평균(13주 MA)"
                  />
                  {/* 라인2: 전년동기 대비 증감률(52주 YoY) (분홍색) */}
                  <Line
                    type="monotone"
                    dataKey="yoyValue"
                    stroke="hsl(289 100% 58%)"
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                    name="전년동기 대비 증감률(52주 YoY)"
                  />
                  {/* 라인3: 종목 주가 (초록색) - ticker 포함 */}
                  <Line
                    type="monotone"
                    dataKey="normalizedPrice"
                    stroke="hsl(142 72% 29%)"
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                    name={`${draggedOverlay.ticker} 주가`}
                  />
                  {/* 라인4: 검색량 기반 (파란색) */}
                  <Line
                    type="monotone"
                    dataKey="trendsValue"
                    stroke="hsl(211 100% 50%)"
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                    name="검색량 기반"
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
    </DragOverlay>
  )
}

// 드래그 가능한 카드 컴포넌트
function SortableOverlayCard({
  overlay,
  chartData,
  mergeChartData,
  formattedDate,
  keywordId,
  mode,
  isSelected,
  onToggleSelect,
  onRefresh,
  isRefreshing,
}: {
  overlay: OverlayItem
  chartData: ChartDataPoint[]
  mergeChartData: (
    a: ChartDataPoint[],
    b: OverlayItem['chartData']
  ) => Array<{
    date: string
    trendsValue: number | null
    ma13Value: number | null
    normalizedPrice: number
    yoyValue: number | null
  }>
  formattedDate: string
  keywordId: string
  mode: 'normal' | 'delete' | 'reorder'
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onRefresh: (id: string) => Promise<void>
  isRefreshing: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: overlay.id })

  const isDraggingCard = isDragging && mode === 'reorder'
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: mode === 'delete' ? 1 : isDraggingCard ? 0.3 : 1,
    zIndex: isDraggingCard ? 9999 : 'auto',
  }

  const mergedData = mergeChartData(chartData, overlay.chartData)

  // delete 모드에서는 Link 제거
  const cardElement = (
    <Card
      ref={setNodeRef}
      style={style}
      onClick={mode === 'delete' ? () => onToggleSelect(overlay.id) : undefined}
      className={cn(
        'relative flex h-full flex-col overflow-hidden transition-all',
        mode === 'normal' && 'cursor-pointer hover:shadow-lg',
        isRefreshing &&
          'border-cyan-400 bg-cyan-50/50 shadow-md ring-2 ring-cyan-400/30 dark:bg-cyan-950/20',
        mode === 'delete' && 'cursor-pointer hover:shadow-lg',
        mode === 'delete' &&
          isSelected &&
          'border-2 border-cyan-400 bg-cyan-50 dark:bg-cyan-950/20',
        mode === 'reorder' && 'cursor-grab hover:cursor-grab',
        mode === 'reorder' &&
          isDraggingCard &&
          'cursor-grabbing border-2 border-blue-500 bg-blue-100 shadow-lg dark:bg-blue-900/30'
      )}
      {...(mode === 'reorder' ? { ...attributes, ...listeners } : {})}
    >
      {isRefreshing && (
        <div className="absolute top-3 right-3 z-20 inline-flex items-center gap-1 rounded-full border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700 shadow-sm dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">
          <RefreshCw className="h-3 w-3 animate-spin" />
          최신화 중
        </div>
      )}

      {/* delete 모드: 토글 스위치 (카드 클릭으로도 토글 가능) */}
      {mode === 'delete' && (
        <div
          className="absolute top-4 left-4 z-20"
          onClick={e => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(overlay.id)}
            aria-label={`${overlay.ticker} 선택`}
          />
        </div>
      )}

      {/* reorder 모드: 드래그 핸들 제거 (카드 전체가 드래그 가능) */}

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
                {/* 라인1: 13주 이동평균(13주 MA) (주황색) */}
                <Line
                  type="monotone"
                  dataKey="ma13Value"
                  stroke="hsl(38 92% 50%)"
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={false}
                  name="13주 이동평균(13주 MA)"
                />
                {/* 라인2: 전년동기 대비 증감률(52주 YoY) (분홍색) */}
                <Line
                  type="monotone"
                  dataKey="yoyValue"
                  stroke="hsl(289 100% 58%)"
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={false}
                  name="전년동기 대비 증감률(52주 YoY)"
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
                {/* 라인4: 검색량 기반 (파란색) */}
                <Line
                  type="monotone"
                  dataKey="trendsValue"
                  stroke="hsl(211 100% 50%)"
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={false}
                  name="검색량 기반"
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

      {mode === 'normal' && (
        <div
          className={cn(
            'bg-background/70 absolute inset-0 flex items-center justify-center backdrop-blur-sm transition-opacity',
            isRefreshing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="bg-background/95 h-12 w-12 rounded-full border-cyan-300 text-cyan-700 shadow-md transition-all hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-800 hover:shadow-lg dark:border-cyan-800 dark:text-cyan-200 dark:hover:bg-cyan-950"
            onClick={event => {
              event.preventDefault()
              event.stopPropagation()
              void onRefresh(overlay.id)
            }}
            disabled={isRefreshing}
            aria-label={`${overlay.ticker} 최신화`}
          >
            <RefreshCw
              className={cn('h-5 w-5', isRefreshing && 'animate-spin')}
            />
          </Button>
        </div>
      )}
    </Card>
  )

  // normal 모드에서만 Link로 감싸기
  if (mode === 'normal') {
    return (
      <Link
        href={`/keywords/${keywordId}/overlays/${overlay.id}`}
        className="group relative"
      >
        {cardElement}
      </Link>
    )
  }

  // delete, reorder 모드에서는 Link 없이
  return <div className="group relative">{cardElement}</div>
}

export function KeywordDetailClient({
  keywordId,
  keyword,
  initialSearchParams,
}: KeywordDetailClientProps) {
  const router = useRouter()

  // 조합 목록
  const [analysesList, setAnalysesList] = useState<AnalysisSummary[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)

  // 필터 상태 (URL 동기화)
  const [region, setRegion] = useState<Region>(initialSearchParams.region)
  const [searchType, setSearchType] = useState<SearchType>(
    initialSearchParams.searchType
  )
  const period: Period = '5Y'

  // 데이터 상태
  const [chartData, setChartData] = useState<
    Array<{
      weekIndex: number
      date: string
      trendsValue: number
      ma13Value: number | null
      yoyValue: number | null
    }>
  >([])
  const [overlays, setOverlays] = useState<OverlayItem[]>([])
  const [currentAnalysis, setCurrentAnalysis] =
    useState<KeywordAnalysis | null>(null)
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true) // 초기 로드 상태
  const [analysisNotFound, setAnalysisNotFound] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const visibleAnalysesList = useMemo(
    () => analysesList.filter(analysis => analysis.period === '5Y'),
    [analysesList]
  )

  // 조합 목록 로드 (마운트 시 1회)
  useEffect(() => {
    const loadAnalysesList = async () => {
      setIsLoadingList(true)
      try {
        const response = await fetch(`/api/keywords/${keywordId}/analyses`)
        if (!response.ok) throw new Error('Failed to load analyses list')

        const apiResponse = await response.json()
        setAnalysesList(apiResponse.data ?? [])
      } catch (error) {
        console.error('Failed to load analyses list:', error)
        setAnalysesList([])
      } finally {
        setIsLoadingList(false)
      }
    }

    loadAnalysesList()
  }, [keywordId])

  const loadOverlays = useCallback(async (analysisId: string) => {
    try {
      const response = await fetch(`/api/analyses/${analysisId}/overlays`)
      if (!response.ok) throw new Error('Failed to load overlays')

      const apiResponse = await response.json()
      const overlayList = apiResponse.data

      if (!Array.isArray(overlayList) || overlayList.length === 0) {
        setOverlays([])
        return
      }

      // 모든 가격 데이터 수집하여 min/max 계산
      let minPrice = Infinity
      let maxPrice = -Infinity

      for (const overlay of overlayList) {
        if (Array.isArray(overlay.chart_data)) {
          for (const point of overlay.chart_data) {
            if (typeof point.rawPrice === 'number') {
              minPrice = Math.min(minPrice, point.rawPrice)
              maxPrice = Math.max(maxPrice, point.rawPrice)
            }
          }
        }
      }

      // 정규화된 overlays 구성
      const convertedOverlays: OverlayItem[] = overlayList
        .map(overlay => {
          if (!Array.isArray(overlay.chart_data)) {
            return null
          }

          const priceData = overlay.chart_data as Array<{
            date: string
            rawPrice: number | null
          }>
          const priceRange = maxPrice - minPrice

          const chartData = priceData
            .filter(
              (point): point is { date: string; rawPrice: number } =>
                typeof point.rawPrice === 'number'
            )
            .map(point => {
              const normalizedPrice =
                priceRange > 0
                  ? ((point.rawPrice - minPrice) / priceRange) * 100
                  : 50

              return {
                date: point.date,
                normalizedPrice: Math.max(0, Math.min(100, normalizedPrice)),
                rawPrice: point.rawPrice,
              }
            })

          return {
            id: overlay.id,
            ticker: overlay.ticker,
            companyName: overlay.company_name,
            displayOrder: overlay.display_order,
            lastRefreshedAt:
              overlay.last_refreshed_at ?? overlay.lastRefreshedAt ?? null,
            chartData,
          } as OverlayItem
        })
        .filter((o): o is OverlayItem => o !== null)

      setOverlays(convertedOverlays)
    } catch (error) {
      console.error('Failed to load overlays:', error)
      setOverlays([])
    }
  }, [])

  const loadAnalysis = useCallback(async () => {
    setIsLoadingAnalysis(true)
    setAnalysisNotFound(false)
    try {
      const response = await fetch(
        `/api/keywords/${keywordId}/analyses?region=${region}&searchType=${searchType}`
      )
      if (!response.ok) throw new Error('Analysis not found')

      const apiResponse = await response.json()
      const analysis = apiResponse.data

      if (!analysis) {
        // Analysis가 없는 경우
        setAnalysisNotFound(true)
        setCurrentAnalysis(null)
        setChartData([])
        setOverlays([])
        return
      }

      setCurrentAnalysis(analysis)

      // chartData는 analysis의 trends_data 사용
      if (analysis.trends_data && Array.isArray(analysis.trends_data)) {
        setChartData(
          analysis.trends_data.map((point: TrendsDataPoint) => ({
            weekIndex: 0, // trends_data는 이미 처리된 데이터
            date: point.date,
            trendsValue: point.value,
            ma13Value: point.ma13Value,
            yoyValue: point.yoyValue,
          }))
        )
      } else {
        setChartData([])
      }

      // overlays는 analysis_id 기준으로 조회
      await loadOverlays(analysis.id)
    } catch (error) {
      console.error('Failed to load analysis:', error)
      setAnalysisNotFound(true)
      setCurrentAnalysis(null)
      setChartData([])
      setOverlays([])
    } finally {
      setIsLoadingAnalysis(false)
    }
  }, [keywordId, loadOverlays, region, searchType])

  // 필터 변경 시 URL 동기화 + 데이터 로드
  useEffect(() => {
    const newUrl = `/keywords/${keywordId}?region=${region}&searchType=${searchType}`
    window.history.replaceState(null, '', newUrl)

    // 분석 조건 변경 시 selectedStock 초기화 (분석별 독립성 보장)
    setSelectedStock(null)
    setStockSearchInput('')
    setShowAutocomplete(false)

    // Analysis 조회
    loadAnalysis()
  }, [region, searchType, keywordId, loadAnalysis])

  const [selectedStock, setSelectedStock] = useState<{
    ticker: string
    companyName: string
    priceData: Array<{
      date: string
      price: number
    }>
  } | null>(null)
  const [stockSearchInput, setStockSearchInput] = useState('')
  const [isSavingCustomChart, setIsSavingCustomChart] = useState(false)
  const [autocompleteResults, setAutocompleteResults] = useState<
    Array<{ ticker: string; companyName: string }>
  >([])
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(-1)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [visibleLines, setVisibleLines] = useState({
    trendsValue: true,
    ma13Value: true,
    yoyValue: true,
    stockPrice: true,
  })
  const [timeframeType, setTimeframeType] = useState<'weeks' | 'years'>('years')
  const [timeframeValue, setTimeframeValue] = useState(5)
  const [timeframeInput, setTimeframeInput] = useState('5')

  // period 변경 시 timeframe 범위 확인
  useEffect(() => {
    const maxYears = PERIOD_MAX_YEARS[period]
    const currentMax = timeframeType === 'years' ? maxYears : maxYears * 52

    if (timeframeValue > currentMax) {
      setTimeframeValue(currentMax)
      setTimeframeInput(currentMax.toString())
    }
  }, [period, timeframeType, timeframeValue])

  // 종목 필터 및 정렬
  const [overlayFilterText, setOverlayFilterText] = useState('')
  const [overlaySortBy, setOverlaySortBy] = useState<
    'order' | 'ticker' | 'name'
  >('order')

  // 카드 관리 모드 (normal: 기본, delete: 선택 삭제, reorder: 위치 변경)
  const [mode, setMode] = useState<'normal' | 'delete' | 'reorder'>('normal')
  const [isEditingOverlays, setIsEditingOverlays] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [refreshingOverlayIds, setRefreshingOverlayIds] = useState<Set<string>>(
    new Set()
  )
  const [isRefreshingAnalysis, setIsRefreshingAnalysis] = useState(false)
  const [reorderBackup, setReorderBackup] = useState<OverlayItem[] | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const canReorderOverlays =
    overlaySortBy === 'order' && overlayFilterText.trim().length === 0

  // 차트 ref (PNG 다운로드)
  const chartRef = useRef<HTMLDivElement>(null)

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
    overlayData: OverlayItem['chartData']
  ) => {
    const keywordMap = new Map(keywordData.map(d => [d.date, d]))

    // overlayData에서 keywordMap에 있는 date만 필터링
    const filteredOverlayData = overlayData.filter(point =>
      keywordMap.has(point.date)
    )

    const merged = filteredOverlayData.map(point => ({
      date: point.date,
      trendsValue: keywordMap.get(point.date)?.trendsValue ?? null,
      ma13Value: keywordMap.get(point.date)?.ma13Value ?? null,
      normalizedPrice: point.normalizedPrice,
      yoyValue: keywordMap.get(point.date)?.yoyValue ?? null,
    }))

    // 마지막 52개만 (1년)
    return merged.slice(Math.max(0, merged.length - 52))
  }

  // 모드 전환
  const handleModeChange = (newMode: 'normal' | 'delete' | 'reorder') => {
    if (newMode === 'reorder') {
      if (!canReorderOverlays) {
        toast.info('위치 변경은 검색 없이 추가 순서에서 사용할 수 있습니다.')
        return
      }

      // 위치 변경 모드로 진입할 때 현재 상태 백업
      setReorderBackup(overlays)
    }
    setMode(newMode)
    setSelectedIds(new Set())
  }

  // 선택 삭제: 카드 토글
  const handleToggleSelect = (overlayId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(overlayId)) {
        newSet.delete(overlayId)
      } else {
        newSet.add(overlayId)
      }
      return newSet
    })
  }

  // 선택 삭제: 전체 선택/해제
  const handleToggleSelectAll = () => {
    if (selectedIds.size === overlays.length) {
      // 모두 선택된 상태 → 전체 해제
      setSelectedIds(new Set())
    } else {
      // 일부만 선택 또는 미선택 → 전체 선택
      setSelectedIds(new Set(overlays.map(o => o.id)))
    }
  }

  // 선택 삭제: 확인 dialog 열기
  const handleOpenDeleteConfirm = () => {
    if (selectedIds.size === 0) {
      toast.error('삭제할 종목을 선택하세요')
      return
    }
    setDeleteConfirmOpen(true)
  }

  // 선택 삭제: 배치 삭제 API 호출
  const handleBatchDelete = async () => {
    if (!currentAnalysis) {
      toast.error('분석 데이터를 먼저 로드해주세요')
      return
    }

    const selectedArray = Array.from(selectedIds)
    setDeletingId('batch')

    try {
      // 분석 overlay는 개별 DELETE route를 병렬 호출해 선택 삭제한다.
      const deletePromises = selectedArray.map(overlayId =>
        fetch(`/api/analyses/${currentAnalysis.id}/overlays/${overlayId}`, {
          method: 'DELETE',
        })
      )

      const results = await Promise.all(deletePromises)
      const allSuccess = results.every(res => res.ok)

      if (!allSuccess) throw new Error('Some deletions failed')

      setOverlays(prev => prev.filter(o => !selectedIds.has(o.id)))
      setSelectedIds(new Set())
      setMode('normal')
      setIsEditingOverlays(false)
      toast.success(`${selectedArray.length}개 종목이 삭제되었습니다`)
    } catch (error) {
      console.error('Batch delete error:', error)
      toast.error('삭제에 실패했습니다')
    } finally {
      setDeletingId(null)
      setDeleteConfirmOpen(false)
    }
  }

  const closeOverlayEditMode = () => {
    if (mode === 'reorder' && reorderBackup) {
      setOverlays(reorderBackup)
    }

    setMode('normal')
    setIsEditingOverlays(false)
    setSelectedIds(new Set())
    setReorderBackup(null)
  }

  // 위치 변경 확인
  const handleConfirmReorder = async () => {
    if (!currentAnalysis) {
      toast.error('분석 데이터를 먼저 로드해주세요')
      return
    }

    try {
      // overlays가 변경되지 않았으므로, reorderBackup이 있으면 사용하고
      // 없으면 현재 overlays 사용
      const finalOrder = overlays.length > 0 ? overlays : reorderBackup || []

      // Phase 6: Analysis 기준 batch reorder API
      const res = await fetch(`/api/analyses/${currentAnalysis.id}/overlays`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overlays: finalOrder.map((o, index) => ({
            id: o.id,
            display_order: index + 1, // 1부터 시작
          })),
        }),
      })

      if (!res.ok) throw new Error('Order update failed')

      setOverlays(prev =>
        [...prev]
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((overlay, index) => ({
            ...overlay,
            displayOrder: index + 1,
          }))
      )
      setMode('normal')
      setIsEditingOverlays(false)
      setReorderBackup(null)
      toast.success('순서가 저장되었습니다')
      await loadOverlays(currentAnalysis.id)
    } catch (error) {
      console.error('Order update error:', error)
      toast.error('순서 저장에 실패했습니다')
      if (reorderBackup) {
        setOverlays(reorderBackup)
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    // 위치 변경 모드에서만 드래그 반응
    if (mode !== 'reorder' || !over || active.id === over.id) return

    const oldIndex = filteredOverlays.findIndex(o => o.id === active.id)
    const newIndex = filteredOverlays.findIndex(o => o.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reorderedVisible = arrayMove(filteredOverlays, oldIndex, newIndex)
    const visibleIdSet = new Set(filteredOverlays.map(o => o.id))
    const reorderedQueue = [...reorderedVisible]

    setOverlays(prev =>
      prev
        .map(overlay => {
          if (!visibleIdSet.has(overlay.id)) return overlay

          const nextOverlay = reorderedQueue.shift()
          return nextOverlay ?? overlay
        })
        .map((overlay, index) => ({
          ...overlay,
          displayOrder: index + 1,
        }))
    )
  }

  // 라인 토글
  const handleToggleLine = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey],
    }))
  }

  // 기간 적용 (입력값은 이미 범위 내로 강제됨)
  const handleApplyTimeframe = () => {
    const value = parseInt(timeframeInput)

    if (isNaN(value) || value < 0) {
      toast.error('유효한 값을 입력하세요')
      return
    }

    setTimeframeValue(value)
    setTimeframeInput(value.toString())
    toast.success(
      `${value}${timeframeType === 'weeks' ? '주' : '년'} 기간으로 설정했습니다`
    )
  }

  const handleRefreshCurrentAnalysis = async () => {
    if (!currentAnalysis) {
      toast.error('분석 데이터를 먼저 로드해주세요')
      return
    }

    setIsRefreshingAnalysis(true)
    try {
      const response = await fetch(
        `/api/analyses/${currentAnalysis.id}/refreshes`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) throw new Error('Analysis refresh failed')

      const body = (await response.json()) as { data?: KeywordAnalysis }
      const refreshedAnalysis = body.data
      if (!refreshedAnalysis)
        throw new Error('Analysis refresh payload missing')

      setCurrentAnalysis(refreshedAnalysis)
      setChartData(
        (refreshedAnalysis.trends_data || []).map(point => ({
          weekIndex: 0,
          date: point.date,
          trendsValue: point.value,
          ma13Value: point.ma13Value,
          yoyValue: point.yoyValue,
        }))
      )

      toast.success('키워드 분석을 최신화했습니다')
    } catch (error) {
      console.error('Analysis refresh error:', error)
      toast.error('키워드 분석 최신화에 실패했습니다')
    } finally {
      setIsRefreshingAnalysis(false)
    }
  }

  const handleRefreshOverlay = async (overlayId: string) => {
    if (!currentAnalysis) {
      toast.error('분석 데이터를 먼저 로드해주세요')
      return
    }

    setRefreshingOverlayIds(prev => new Set(prev).add(overlayId))
    try {
      const response = await fetch(
        `/api/analyses/${currentAnalysis.id}/overlays/${overlayId}/refreshes`,
        { method: 'POST' }
      )

      if (!response.ok) throw new Error('Overlay refresh failed')

      await loadOverlays(currentAnalysis.id)
      toast.success('오버레이 종목을 최신화했습니다')
    } catch (error) {
      console.error('Overlay refresh error:', error)
      toast.error('오버레이 종목 최신화에 실패했습니다')
    } finally {
      setRefreshingOverlayIds(prev => {
        const next = new Set(prev)
        next.delete(overlayId)
        return next
      })
    }
  }

  // Excel 다운로드
  const handleDownloadExcel = async () => {
    if (!currentAnalysis || !chartData) {
      toast.error('분석 데이터를 먼저 로드해주세요')
      return
    }

    try {
      generateKeywordAnalysisExcelFile({
        keyword: keyword.keyword,
        region,
        period,
        searchType,
        trendsData: currentAnalysis.trends_data || [],
        ma13Data: currentAnalysis.ma13_data,
        yoyData: currentAnalysis.yoy_data,
        overlayData: overlays.map(o => ({
          ticker: o.ticker,
          companyName: o.companyName,
        })),
      })
      toast.success('Excel 파일이 다운로드되었습니다')
    } catch (error) {
      console.error('Excel 다운로드 오류:', error)
      toast.error('Excel 다운로드에 실패했습니다')
    }
  }

  // PNG 다운로드
  const handleDownloadPNG = async () => {
    if (!chartRef.current) {
      toast.error('차트를 찾을 수 없습니다')
      return
    }

    try {
      await captureChartAsPng(chartRef.current, {
        ticker: keyword.keyword,
        chartName: `trends_${region}_${period}_${searchType}`,
      })
      toast.success('차트 이미지가 다운로드되었습니다')
    } catch (error) {
      console.error('PNG 다운로드 오류:', error)
      toast.error('차트 저장에 실패했습니다')
    }
  }

  // 기간 표시 텍스트
  const getTimeframeDisplayText = () => {
    if (timeframeType === 'weeks') {
      return `${timeframeValue}주 분석`
    } else {
      return `${timeframeValue}년 분석`
    }
  }

  // 종목 필터링 및 정렬
  const getFilteredAndSortedOverlays = () => {
    let result = [...overlays]

    // 필터링 (검색어)
    if (overlayFilterText.trim()) {
      const query = overlayFilterText.toLowerCase()
      result = result.filter(
        o =>
          o.ticker.toLowerCase().includes(query) ||
          o.companyName.toLowerCase().includes(query)
      )
    }

    // 정렬
    switch (overlaySortBy) {
      case 'ticker':
        result.sort((a, b) => a.ticker.localeCompare(b.ticker))
        break
      case 'name':
        result.sort((a, b) => a.companyName.localeCompare(b.companyName))
        break
      case 'order':
      default:
        result.sort((a, b) => a.displayOrder - b.displayOrder)
    }

    return result
  }

  const filteredOverlays = getFilteredAndSortedOverlays()

  // 자동완성 검색
  const handleStockSearch = async (query: string) => {
    if (query.length < 1) {
      setAutocompleteResults([])
      setShowAutocomplete(false)
      setSelectedAutocompleteIndex(-1)
      return
    }

    try {
      const res = await fetch(`/api/stocks/search?q=${query.toUpperCase()}`)
      if (!res.ok) throw new Error('Search failed')

      const data = await res.json()
      setAutocompleteResults(data.data || [])
      setShowAutocomplete(true)
      setSelectedAutocompleteIndex(-1)
    } catch (error) {
      console.error('Stock search error:', error)
      setAutocompleteResults([])
    }
  }

  // 자동완성 항목 선택 (클릭 시)
  const handleSelectAutocomplete = (ticker: string, companyName: string) => {
    void companyName
    setStockSearchInput(ticker)
    setShowAutocomplete(false)
    setAutocompleteResults([])
    setSelectedAutocompleteIndex(-1)
  }

  // 자동완성 항목 선택 후 즉시 검색 (Enter 시)
  const handleSelectAndSearch = async (ticker: string, companyName: string) => {
    void companyName
    setStockSearchInput(ticker)
    setShowAutocomplete(false)
    setAutocompleteResults([])
    setSelectedAutocompleteIndex(-1)

    // 즉시 종목 데이터 가져오기 (임시 조회, DB 저장 안 함)
    try {
      const res = await fetch(`/api/stocks/${ticker}`)

      if (!res.ok) {
        if (res.status === 404) {
          toast.error('종목을 찾을 수 없습니다')
        } else {
          throw new Error('Failed to fetch stock data')
        }
        return
      }

      const data = await res.json()
      setSelectedStock(data.data)
      toast.success(`${ticker} 종목이 추가되었습니다`)
    } catch (error) {
      console.error('Stock data error:', error)
      toast.error('종목 데이터를 불러오지 못했습니다')
    }
  }

  // 자동완성 키보드 네비게이션
  const handleStockInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!showAutocomplete || autocompleteResults.length === 0) {
      if (e.key === 'Enter' && stockSearchInput.trim()) {
        e.preventDefault()
        handleAddStock()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedAutocompleteIndex(prev => {
          const nextIndex =
            prev < autocompleteResults.length - 1 ? prev + 1 : prev
          const nextResult = autocompleteResults[nextIndex]
          if (nextResult) {
            setStockSearchInput(nextResult.ticker)
          }
          return nextIndex
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedAutocompleteIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : -1
          const nextResult = autocompleteResults[nextIndex]
          if (nextResult) {
            setStockSearchInput(nextResult.ticker)
          }
          return nextIndex
        })
        break
      case 'Enter':
        e.preventDefault()
        if (selectedAutocompleteIndex >= 0) {
          const selected = autocompleteResults[selectedAutocompleteIndex]
          // Enter로 자동완성 선택 → 즉시 검색
          handleSelectAndSearch(selected.ticker, selected.companyName)
        } else if (stockSearchInput.trim()) {
          handleAddStock()
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowAutocomplete(false)
        break
      default:
        break
    }
  }

  const handleAddStock = async () => {
    if (!stockSearchInput.trim()) {
      toast.error('종목 심볼을 입력하세요')
      return
    }

    try {
      // API에서 종목 데이터 조회 (임시 조회, DB 저장 안 함)
      const res = await fetch(`/api/stocks/${stockSearchInput}`)

      if (!res.ok) {
        if (res.status === 404) {
          toast.error('종목을 찾을 수 없습니다')
        } else {
          throw new Error('Failed to fetch stock data')
        }
        return
      }

      const data = await res.json()
      setSelectedStock(data.data)
      toast.success(`${stockSearchInput} 종목이 추가되었습니다`)
    } catch (error) {
      console.error('Stock data error:', error)
      toast.error('종목 데이터를 불러오지 못했습니다')
    }
  }

  const handleSaveCustomChart = async () => {
    if (!selectedStock) {
      toast.error('종목을 선택하세요')
      return
    }

    if (!currentAnalysis) {
      toast.error('분석 데이터를 먼저 로드해주세요')
      return
    }

    setIsSavingCustomChart(true)
    try {
      const overlayRes = await fetch(
        `/api/analyses/${currentAnalysis.id}/overlays`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker: selectedStock.ticker,
            company_name: selectedStock.companyName,
            region,
            period,
            search_type: searchType,
          }),
        }
      )

      if (overlayRes.ok) {
        toast.success('커스텀 차트가 저장되었습니다')

        // 상태 초기화
        setSelectedStock(null)
        setStockSearchInput('')

        // 오버레이 목록 새로고침
        await loadOverlays(currentAnalysis.id)
      } else if (overlayRes.status === 409) {
        // 409 에러: DUPLICATE 또는 FILTER_MISMATCH
        const errorData = await overlayRes.json()
        const errorCode = errorData.error?.code

        if (errorCode === 'FILTER_MISMATCH') {
          toast.error('분석 설정이 변경되었습니다. 페이지를 새로고침해주세요.')
        } else {
          toast.info('이미 추가된 종목입니다')
          // DUPLICATE는 오버레이 목록 새로고침
          await loadOverlays(currentAnalysis.id)
        }
      } else {
        const errorData = await overlayRes.json()
        throw new Error(
          errorData.error?.message || 'Failed to save custom chart'
        )
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('저장에 실패했습니다')
    } finally {
      setIsSavingCustomChart(false)
    }
  }

  const formattedDate = formatDisplayDate(
    currentAnalysis?.updated_at ?? keyword.updated_at ?? keyword.searched_at
  )
  const selectedAnalysisLabel = `${REGION_LABEL[region]} · ${SEARCH_TYPE_LABEL[searchType]} · 5Y`

  return (
    <div className="bg-background min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        {/* 헤더 */}
        <div className="mb-8">
          <Link
            href="/trends"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            ← 내 키워드로 돌아가기
          </Link>
          <div className="mt-6 space-y-1">
            <h1 className="text-5xl font-extrabold tracking-tight">
              <span className="text-blue-600 dark:text-blue-400">
                {keyword.keyword}
              </span>
              <span className="text-foreground"> 키워드 분석</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Google Trends 데이터는 완료된 전주까지 수집되며, 주간 검색 관심도
              기준으로 분석됩니다.
            </p>
          </div>
        </div>

        {/* 분석 선택 및 현재 분석 액션 */}
        <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="bg-card rounded-lg border p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">저장된 분석</h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  분석을 선택하면 차트와 커스텀 종목 목록이 함께 전환됩니다
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(
                    `/keyword-analysis/new?keyword=${encodeURIComponent(keyword.keyword)}`
                  )
                }
                className="h-8 shrink-0 text-xs"
              >
                + 분석 추가
              </Button>
            </div>

            {!isLoadingList && visibleAnalysesList.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {visibleAnalysesList.map(analysis => {
                  const isSelected =
                    analysis.region === region &&
                    analysis.search_type === searchType

                  return (
                    <button
                      key={`${analysis.region}-${analysis.search_type}`}
                      type="button"
                      onClick={() => {
                        setRegion(analysis.region)
                        setSearchType(analysis.search_type)
                      }}
                      className={cn(
                        'rounded-lg border p-3 text-left transition-all',
                        'hover:border-cyan-300 hover:bg-cyan-50/60 dark:hover:bg-cyan-950/20',
                        isSelected
                          ? 'border-cyan-400 bg-cyan-50 ring-2 ring-cyan-400/20 dark:bg-cyan-950/30'
                          : 'border-border bg-background'
                      )}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold">
                          {REGION_LABEL[analysis.region]}
                        </span>
                        {isSelected && (
                          <span className="rounded-full bg-cyan-600 px-2 py-0.5 text-xs font-medium text-white">
                            선택됨
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {SEARCH_TYPE_LABEL[analysis.search_type]} · 5Y
                      </p>
                    </button>
                  )
                })}
              </div>
            ) : !isLoadingList ? (
              <div className="bg-muted/50 rounded border border-dashed p-5 text-center">
                <p className="text-muted-foreground text-xs">
                  저장된 분석이 없습니다
                </p>
              </div>
            ) : (
              <div className="bg-muted/50 rounded border border-dashed p-5 text-center">
                <p className="text-muted-foreground text-xs">로드 중...</p>
              </div>
            )}
          </div>

          <div
            className={cn(
              'bg-card rounded-lg border p-5 transition-all',
              isRefreshingAnalysis &&
                'border-cyan-400 bg-cyan-50/50 ring-2 ring-cyan-400/20 dark:bg-cyan-950/20'
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  현재 분석
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  {selectedAnalysisLabel}
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  마지막 갱신: {formattedDate || '-'}
                </p>
              </div>
              {isRefreshingAnalysis && (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  진행 중
                </span>
              )}
            </div>

            <div className="grid gap-2">
              <Button
                variant="outline"
                onClick={handleRefreshCurrentAnalysis}
                disabled={
                  !currentAnalysis || isLoadingAnalysis || isRefreshingAnalysis
                }
                className="justify-start border-cyan-300 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800 dark:border-cyan-800 dark:text-cyan-200 dark:hover:bg-cyan-950"
              >
                <RefreshCw
                  className={cn(
                    'mr-2 h-4 w-4',
                    isRefreshingAnalysis && 'animate-spin'
                  )}
                />
                현재 분석 최신화
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadExcel}
                  disabled={!currentAnalysis || isLoadingAnalysis}
                >
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPNG}
                  disabled={!currentAnalysis || isLoadingAnalysis}
                >
                  PNG
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 분석 데이터 부재 시 Empty State */}
        {analysisNotFound && !isLoadingAnalysis && (
          <div className="bg-muted/50 mb-12 rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground mb-4">
              저장된 5년 분석이 없습니다.
            </p>
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `/keyword-analysis/new?keyword=${encodeURIComponent(keyword.keyword)}`
                )
              }
            >
              + 새로운 분석 추가
            </Button>
          </div>
        )}

        {/* 로딩 중 */}
        {isLoadingAnalysis && (
          <div className="bg-muted/50 mb-12 rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              분석 데이터를 로드하는 중...
            </p>
          </div>
        )}

        {/* 섹션1: 현재 키워드 차트(단독) + 종목 오버레이 */}
        {!analysisNotFound && !isLoadingAnalysis && (
          <>
            <div className="mb-12 space-y-4">
              {/* 종목 선택 섹션 */}
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="종목 심볼 입력 (예: AAPL, TSLA)"
                      value={stockSearchInput}
                      onChange={e => {
                        const newValue = e.target.value.toUpperCase()
                        setStockSearchInput(newValue)
                        handleStockSearch(newValue)
                      }}
                      onKeyDown={handleStockInputKeyDown}
                      onBlur={() =>
                        setTimeout(() => setShowAutocomplete(false), 200)
                      }
                      className="border-input bg-background w-full rounded border px-3 py-2 text-sm"
                    />

                    {/* 자동완성 드롭다운 */}
                    {showAutocomplete && autocompleteResults.length > 0 && (
                      <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-48 overflow-y-auto rounded border border-gray-300 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        {autocompleteResults.map((result, index) => (
                          <div
                            key={`${result.ticker}-${index}`}
                            onClick={() =>
                              handleSelectAutocomplete(
                                result.ticker,
                                result.companyName
                              )
                            }
                            className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                              index === selectedAutocompleteIndex
                                ? 'bg-blue-500 text-white'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="font-semibold">{result.ticker}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {result.companyName}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handleAddStock()}
                    disabled={!stockSearchInput || !!selectedStock}
                  >
                    종목 추가
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedStock(null)
                      setStockSearchInput('')
                      setShowAutocomplete(false)
                    }}
                    variant="outline"
                    disabled={!selectedStock}
                  >
                    종목 제거
                  </Button>
                </div>
              </div>

              {/* 기간 설정 */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={timeframeInput}
                  onChange={e => {
                    let value = e.target.value

                    // 숫자만 추출
                    value = value.replace(/[^\d]/g, '')

                    const maxYears = PERIOD_MAX_YEARS[period]

                    if (timeframeType === 'weeks') {
                      // 주 단위: period 기반 범위 강제
                      const maxWeeks = maxYears * 52
                      const intValue = parseInt(value)
                      if (!isNaN(intValue)) {
                        if (intValue < 1) {
                          value = '1'
                        } else if (intValue > maxWeeks) {
                          value = maxWeeks.toString()
                        } else {
                          value = intValue.toString()
                        }
                      }
                    } else {
                      // 년 단위: period 기반 범위 강제
                      const intValue = parseInt(value)
                      if (!isNaN(intValue)) {
                        if (intValue < 1) {
                          value = '1'
                        } else if (intValue > maxYears) {
                          value = maxYears.toString()
                        } else {
                          value = intValue.toString()
                        }
                      }
                    }

                    setTimeframeInput(value)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleApplyTimeframe()
                    }
                  }}
                  className="border-input bg-background w-20 rounded border px-3 py-2 text-sm"
                  placeholder={
                    timeframeType === 'weeks'
                      ? `1-${PERIOD_MAX_YEARS[period] * 52}`
                      : `1-${PERIOD_MAX_YEARS[period]}`
                  }
                />
                <select
                  value={timeframeType}
                  onChange={e => {
                    const newType = e.target.value as 'weeks' | 'years'
                    setTimeframeType(newType)

                    if (newType === 'weeks') {
                      // 년에서 주로 변경: 현재 값을 주 단위로 변환
                      const currentValue = parseInt(timeframeInput)
                      if (!isNaN(currentValue) && currentValue > 0) {
                        const weeks = currentValue * 52
                        setTimeframeInput(
                          Math.max(1, Math.min(weeks, 260)).toString()
                        )
                      } else {
                        setTimeframeInput('52')
                      }
                    } else {
                      // 주에서 년으로 변경: 기본값 '1'로 초기화
                      setTimeframeInput('1')
                    }
                  }}
                  className="border-input bg-background rounded border px-3 py-2 text-sm"
                >
                  <option value="weeks">주</option>
                  <option value="years">년</option>
                </select>
                <Button
                  onClick={handleApplyTimeframe}
                  variant="outline"
                  size="sm"
                >
                  적용
                </Button>
                <span className="text-muted-foreground text-sm">
                  {getTimeframeDisplayText()}
                </span>
              </div>

              {/* 차트 */}
              <div ref={chartRef}>
                <KeywordStandaloneChart
                  keyword={keyword.keyword}
                  chartData={chartData}
                  formattedDate={formattedDate}
                  overlayStock={selectedStock || undefined}
                  overlays={[]}
                  timeframeType={timeframeType}
                  timeframeValue={timeframeValue}
                  visibleLines={visibleLines}
                  onToggleLine={handleToggleLine}
                />
              </div>

              {/* 커스텀 차트 저장 버튼 */}
              {selectedStock && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveCustomChart}
                    disabled={isSavingCustomChart}
                    className="h-10"
                  >
                    {isSavingCustomChart ? '저장 중...' : '커스텀 차트 저장'}
                  </Button>
                </div>
              )}
            </div>

            <div className="border-border my-12 border-t" />

            {/* 섹션2: 해당 키워드 커스텀 차트 목록 */}
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="mb-2 text-3xl font-bold">
                    {keyword.keyword} 키워드 커스텀 목록
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {chartData.length > 0
                      ? `${chartData[0].date} ~ ${chartData[chartData.length - 1].date} (${chartData.length}주)`
                      : '데이터 없음'}
                    • 오버레이 {overlays.length}개
                  </p>
                </div>
              </div>

              {/* 모드별 버튼 UI */}
              {overlays.length > 0 && (
                <div className="mb-6 space-y-3">
                  <div className="flex justify-end gap-2">
                    {!isEditingOverlays && mode === 'normal' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingOverlays(true)}
                        className="border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        편집
                      </Button>
                    ) : mode === 'normal' ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleModeChange('delete')}
                          className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          선택 삭제
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleModeChange('reorder')}
                          className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                        >
                          <GripVertical className="mr-2 h-4 w-4" />
                          위치 변경
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={closeOverlayEditMode}
                          className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <X className="mr-2 h-4 w-4" />
                          완료
                        </Button>
                      </div>
                    ) : mode === 'delete' ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={closeOverlayEditMode}
                          className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <X className="mr-2 h-4 w-4" />
                          완료
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handleConfirmReorder}
                        size="sm"
                        className="bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        완료
                      </Button>
                    )}
                  </div>

                  {mode === 'delete' && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleToggleSelectAll}
                          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {selectedIds.size === overlays.length
                            ? '전체 해제'
                            : '전체 선택'}
                        </Button>
                        {selectedIds.size > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedIds(new Set())}
                            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            선택 해제
                          </Button>
                        )}
                        <span className="text-muted-foreground text-sm">
                          {selectedIds.size}개 선택됨
                        </span>
                      </div>
                      {selectedIds.size > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenDeleteConfirm}
                          className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingId === 'batch' ? '삭제 중...' : '삭제'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 오버레이 그리드 */}
              {overlays.length > 0 ? (
                <>
                  {/* 필터링 및 정렬 컨트롤 */}
                  <div className="mb-6 flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex-1">
                        <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                          검색 (Ticker 또는 회사명)
                        </label>
                        <Input
                          placeholder="예: AAPL, Apple"
                          value={overlayFilterText}
                          onChange={e => setOverlayFilterText(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="w-full sm:w-48">
                        <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                          정렬
                        </label>
                        <Select
                          value={overlaySortBy}
                          onValueChange={value =>
                            setOverlaySortBy(
                              value as 'order' | 'ticker' | 'name'
                            )
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="order">추가 순서</SelectItem>
                            <SelectItem value="ticker">Ticker</SelectItem>
                            <SelectItem value="name">회사명</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      총 종목 수: {filteredOverlays.length}/{overlays.length}
                    </div>
                  </div>

                  {filteredOverlays.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={filteredOverlays.map(o => o.id)}
                        strategy={rectSortingStrategy}
                      >
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {filteredOverlays.map(overlay => (
                            <SortableOverlayCard
                              key={overlay.id}
                              overlay={overlay}
                              chartData={chartData}
                              mergeChartData={mergeChartData}
                              formattedDate={
                                formatDisplayDate(
                                  overlay.lastRefreshedAt ??
                                    currentAnalysis?.updated_at ??
                                    keyword.updated_at ??
                                    keyword.searched_at
                                ) || formattedDate
                              }
                              keywordId={keyword.id}
                              mode={mode}
                              isSelected={selectedIds.has(overlay.id)}
                              onToggleSelect={handleToggleSelect}
                              onRefresh={handleRefreshOverlay}
                              isRefreshing={refreshingOverlayIds.has(
                                overlay.id
                              )}
                            />
                          ))}
                        </div>
                      </SortableContext>
                      <DragOverlayComponent
                        overlays={filteredOverlays}
                        chartData={chartData}
                        mergeChartData={mergeChartData}
                        formattedDate={formattedDate}
                      />
                    </DndContext>
                  ) : (
                    <Card>
                      <CardContent className="flex items-center justify-center py-12">
                        <p className="text-muted-foreground text-sm">
                          검색 결과가 없습니다
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </>
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
                      하단 카드는 키워드 + 종목 조합의 정확한 시계열
                      데이터입니다 (1년치 = 52주)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 font-bold text-green-500">✓</span>
                    <span>
                      각 카드는 4개 라인으로 구성:{' '}
                      <span className="font-medium">
                        13주 이동평균(13주 MA)
                      </span>
                      (주황색),{' '}
                      <span className="font-medium">
                        전년동기 대비 증감률(52주 YoY)
                      </span>
                      (분홍색),{' '}
                      <span className="font-medium">
                        AAPL/TSLA 등 종목 주가
                      </span>
                      (초록색), <span className="font-medium">검색량 기반</span>
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
          </>
        )}

        {/* 삭제 확인 Dialog */}
        <AlertDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>종목 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                선택된 {selectedIds.size}개의 종목을 삭제하시겠습니까?
                <br />이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBatchDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
