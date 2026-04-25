'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Check,
  ChevronsUpDown,
  GripVertical,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Container } from '@/components/layout/container'
import { KeywordCard } from '@/components/keyword/keyword-trends/keyword-card'
import {
  filterKeywordsByLanguage,
  type KeywordLanguage,
} from '@/lib/utils/keyword-classifier'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { apiFetchJson, apiFetch } from '@/lib/fetch-client'
import { CHART_SERIES_COLORS } from '@/lib/constants/chart-series'
import type {
  KeywordAnalysisOverlay,
  KeywordAnalysisSummary,
  KeywordRecord,
  Region,
  SearchType,
} from '@/types/database'

interface MyKeywordsClientProps {
  initialKeywords: KeywordRecord[]
}

type EditMode = 'none' | 'delete' | 'reorder'
type KeywordFilter = 'all' | KeywordLanguage | 'stock'
type KeywordSort = 'custom' | 'latest' | 'name'
type SearchMode = 'keyword' | 'condition' | 'ticker'

type StockSuggestion = {
  ticker: string
  companyName: string
}

type ConditionEntry = {
  id: string
  keyword: KeywordRecord
  analysis: KeywordAnalysisSummary
  overlay?: KeywordAnalysisOverlay
  label: string
  conditionLabel: string
  tickerLabel?: string
  updatedAt: string
}

type ConditionChartTooltipEntry = {
  color?: string
  dataKey?: string | number
  name?: string
  value?: number | string | null
}

type ConditionChartTooltipState = {
  label?: string | number
  payload: ConditionChartTooltipEntry[]
}

type ConditionChartPoint = {
  date: string
  trendsValue: number | null
  ma13Value: number | null
  yoyValue: number | null
  normalizedPrice?: number | null
}

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

function buildConditionChartTooltipPayload(
  point: ConditionChartPoint,
  ticker?: string
): ConditionChartTooltipEntry[] {
  const payload: ConditionChartTooltipEntry[] = [
    {
      color: CHART_SERIES_COLORS.ma13,
      dataKey: 'ma13Value',
      name: '13주 이동평균(13주 MA)',
      value: point.ma13Value,
    },
    {
      color: CHART_SERIES_COLORS.yoy,
      dataKey: 'yoyValue',
      name: '13주 이동평균 기준 전년동기 대비 증감률(52주 YoY)',
      value: point.yoyValue,
    },
    {
      color: CHART_SERIES_COLORS.googleTrends,
      dataKey: 'trendsValue',
      name: '검색량 기반',
      value: point.trendsValue,
    },
  ]

  if (ticker && typeof point.normalizedPrice === 'number') {
    payload.splice(2, 0, {
      color: CHART_SERIES_COLORS.price,
      dataKey: 'normalizedPrice',
      name: `${ticker} 주가`,
      value: point.normalizedPrice,
    })
  }

  return payload
}

function formatConditionChartTooltipValue(entry: ConditionChartTooltipEntry) {
  if (typeof entry.value !== 'number') return entry.value ?? '-'
  if (entry.dataKey === 'yoyValue') return `${entry.value.toFixed(1)}%`
  if (entry.dataKey === 'normalizedPrice') return entry.value.toFixed(2)
  return Number.isInteger(entry.value)
    ? entry.value.toString()
    : entry.value.toFixed(2)
}

function ConditionChartTooltipContent({
  active,
  label,
  payload,
}: {
  active?: boolean
  label?: string | number
  payload?: ConditionChartTooltipEntry[]
}) {
  if (!active || !payload || payload.length === 0) return null

  const visiblePayload = payload.filter(
    entry => entry.value !== null && entry.value !== undefined
  )

  if (visiblePayload.length === 0) return null

  return (
    <div className="min-w-52 rounded-md border border-slate-300/80 bg-white/82 px-3 py-2 shadow-lg ring-1 ring-slate-200/60 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-950/78 dark:ring-slate-800/70">
      <div className="text-[11px] font-semibold tracking-tight text-slate-700 dark:text-slate-200">
        {label}
      </div>
      <div className="mt-2 grid gap-1.5">
        {visiblePayload.map(entry => (
          <div
            key={`${String(entry.dataKey)}-${entry.name}`}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: entry.color ?? 'currentColor' }}
              />
              <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                {entry.name}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-950 tabular-nums dark:text-slate-50">
              {formatConditionChartTooltipValue(entry)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function getConditionChartTooltipStyle(rect: DOMRect): CSSProperties {
  const tooltipWidth = 248
  const gap = 12
  const viewportWidth =
    typeof window !== 'undefined'
      ? window.innerWidth
      : rect.right + tooltipWidth

  const hasRightSpace = viewportWidth - rect.right >= tooltipWidth + gap
  const left = hasRightSpace
    ? rect.right + gap
    : Math.max(12, rect.left - tooltipWidth - gap)

  return {
    top: Math.max(12, rect.top),
    left,
    width: tooltipWidth,
  }
}

function SortableKeywordCard({
  keyword,
  children,
}: {
  keyword: KeywordRecord
  children: ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: keyword.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 10 : 'auto',
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

function SortableConditionCard({
  entry,
  children,
}: {
  entry: ConditionEntry
  children: ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 10 : 'auto',
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

function EmptyKeywordsState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="mb-4 text-5xl" aria-hidden="true">
        🔍
      </div>
      <h2 className="mb-2 text-lg font-semibold">
        아직 저장된 키워드가 없어요
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">
        관심 있는 키워드를 검색하고 저장해보세요
      </p>
      <Link href="/keyword-analysis/new">
        <Button>검색하기</Button>
      </Link>
    </div>
  )
}

function EmptyFilteredState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 text-4xl" aria-hidden="true">
        ✨
      </div>
      <h2 className="mb-2 text-base font-semibold">키워드가 없어요</h2>
      <p className="text-muted-foreground text-sm">
        검색어나 필터를 바꿔보세요
      </p>
    </div>
  )
}

function KeywordConditionCard({
  entry,
  mode = 'normal',
  isSelected = false,
  onToggleSelect,
}: {
  entry: ConditionEntry
  mode?: 'normal' | 'delete' | 'reorder'
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
}) {
  const formattedDate = new Date(entry.updatedAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const [activeTooltip, setActiveTooltip] =
    useState<ConditionChartTooltipState | null>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const overlayDataByDate = useMemo(() => {
    const map = new Map<string, number | null>()

    entry.overlay?.chart_data?.forEach(point => {
      map.set(point.date, point.normalizedPrice)
    })

    return map
  }, [entry.overlay])
  const chartData =
    entry.analysis.trends_data?.map(
      (point): ConditionChartPoint => ({
        date: point.date,
        trendsValue: point.value,
        ma13Value: point.ma13Value,
        yoyValue: point.yoyValue,
        normalizedPrice: entry.overlay
          ? (overlayDataByDate.get(point.date) ?? null)
          : undefined,
      })
    ) ?? []
  const dateRange =
    chartData.length > 0
      ? `${chartData[0].date} ~ ${chartData[chartData.length - 1].date}`
      : '데이터 없음'
  const tooltipRect = chartWrapperRef.current?.getBoundingClientRect()

  const card = (
    <div className="group relative z-0 hover:z-30">
      {activeTooltip &&
        tooltipRect &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999]"
            style={getConditionChartTooltipStyle(tooltipRect)}
          >
            <ConditionChartTooltipContent
              active
              label={activeTooltip.label}
              payload={activeTooltip.payload}
            />
          </div>,
          document.body
        )}
      <div
        className={cn(
          'border-border/50 from-card to-card/80 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 transition-all duration-200',
          mode === 'normal'
            ? 'hover:border-primary/70 hover:shadow-primary/10 cursor-pointer backdrop-blur-sm hover:shadow-md'
            : 'cursor-pointer',
          mode === 'reorder' && 'cursor-grab active:cursor-grabbing',
          mode === 'delete' &&
            isSelected &&
            'border-primary bg-primary/5 ring-primary/20 ring-2'
        )}
        onClick={
          mode === 'delete' ? () => onToggleSelect?.(entry.id) : undefined
        }
      >
        {mode === 'delete' && (
          <div className="absolute top-3 left-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.(entry.id)}
              onClick={event => event.stopPropagation()}
              aria-label={`${entry.label} 선택`}
            />
          </div>
        )}
        {mode === 'reorder' && (
          <div className="absolute top-3 left-3">
            <GripVertical className="text-muted-foreground h-4 w-4" />
          </div>
        )}
        <div
          className={cn(
            'flex h-full flex-col',
            (mode === 'delete' || mode === 'reorder') && 'pl-8'
          )}
        >
          <div className="space-y-1">
            <h3 className="text-foreground truncate leading-tight font-semibold">
              {entry.keyword.keyword}
            </h3>
            <p className="text-primary truncate text-sm font-medium">
              {entry.conditionLabel}
            </p>
            {entry.overlay && (
              <p className="text-muted-foreground truncate text-xs font-medium">
                {entry.overlay.ticker} · {entry.overlay.company_name}
              </p>
            )}
          </div>

          {chartData.length > 0 ? (
            <div
              ref={chartWrapperRef}
              className="mt-3 h-40 cursor-default"
              onClick={event => {
                event.preventDefault()
                event.stopPropagation()
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 4, right: 6, left: -22, bottom: 0 }}
                  onMouseMove={state => {
                    const tooltipState = state as {
                      activeTooltipIndex?: number | string
                      activeLabel?: string | number
                      isTooltipActive?: boolean
                    }
                    const rawIndex = tooltipState.activeTooltipIndex
                    const index =
                      typeof rawIndex === 'number'
                        ? rawIndex
                        : typeof rawIndex === 'string'
                          ? Number(rawIndex)
                          : NaN
                    const point =
                      Number.isInteger(index) && index >= 0
                        ? chartData[index]
                        : undefined

                    if (!tooltipState.isTooltipActive || !point) {
                      setActiveTooltip(null)
                      return
                    }

                    setActiveTooltip({
                      label: tooltipState.activeLabel ?? point.date,
                      payload: buildConditionChartTooltipPayload(
                        point,
                        entry.overlay?.ticker
                      ),
                    })
                  }}
                  onMouseLeave={() => setActiveTooltip(null)}
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
                    content={() => null}
                    cursor={{
                      stroke: 'hsl(var(--border))',
                      strokeDasharray: '3 3',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ma13Value"
                    stroke={CHART_SERIES_COLORS.ma13}
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="yoyValue"
                    stroke={CHART_SERIES_COLORS.yoy}
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="trendsValue"
                    stroke={CHART_SERIES_COLORS.googleTrends}
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                  />
                  {entry.overlay && (
                    <Line
                      type="monotone"
                      dataKey="normalizedPrice"
                      stroke={CHART_SERIES_COLORS.price}
                      strokeWidth={2}
                      isAnimationActive={false}
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-muted-foreground bg-muted mt-3 flex h-40 items-center justify-center rounded text-xs">
              데이터 없음
            </div>
          )}

          <div className="text-muted-foreground mt-2 flex items-center justify-between gap-2 border-t pt-1 text-[10px] leading-none">
            <span>{formattedDate}</span>
            <span className="truncate text-right">{dateRange}</span>
          </div>
        </div>
      </div>
    </div>
  )

  if (mode === 'delete' || mode === 'reorder') return card

  return (
    <Link
      href={
        entry.overlay
          ? `/keywords/${entry.keyword.id}/overlays/${entry.overlay.id}`
          : `/keywords/${entry.keyword.id}?region=${entry.analysis.region}&searchType=${entry.analysis.search_type}`
      }
    >
      {card}
    </Link>
  )
}

export function MyKeywordsClient({ initialKeywords }: MyKeywordsClientProps) {
  const [keywords, setKeywords] = useState<KeywordRecord[]>(initialKeywords)
  const [isLoading, setIsLoading] = useState(false)
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set())

  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('keyword')
  const [keywordFilter, setKeywordFilter] = useState<KeywordFilter>('all')
  const [keywordSort, setKeywordSort] = useState<KeywordSort>('custom')
  const [stockSearchInput, setStockSearchInput] = useState('')
  const [stockSuggestions, setStockSuggestions] = useState<StockSuggestion[]>(
    []
  )
  const [showStockSuggestions, setShowStockSuggestions] = useState(false)
  const [selectedStockIndex, setSelectedStockIndex] = useState(-1)
  const [selectedStockFilter, setSelectedStockFilter] =
    useState<StockSuggestion | null>(null)
  const [isSearchingStocks, setIsSearchingStocks] = useState(false)
  const stockSearchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const stockSearchWrapperRef = useRef<HTMLDivElement>(null)

  // 무한스크롤
  const [displayCount, setDisplayCount] = useState(100)
  const lastElementRef = useRef<HTMLDivElement>(null)

  // 편집 모드 관련 상태
  const [isEditMode, setIsEditMode] = useState(false)
  const [editMode, setEditMode] = useState<EditMode>('none')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<'selected' | null>(null)
  const [conditionDeleteTarget, setConditionDeleteTarget] = useState<
    'selected' | null
  >(null)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [selectedConditionIds, setSelectedConditionIds] = useState<Set<string>>(
    new Set()
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  // fetch 로직을 useCallback으로 추출
  const fetchKeywords = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiFetchJson<KeywordRecord[]>('/api/keywords')
      setKeywords(Array.isArray(data) ? data : [])
    } catch {
      // 실패해도 initialKeywords 사용
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 마운트 시 API에서 키워드 fetch
  useEffect(() => {
    fetchKeywords()
  }, [fetchKeywords])

  // 필터/정렬 변경 시 편집 모드 해제 + displayCount 초기화
  useEffect(() => {
    setDisplayCount(100)
    setIsEditMode(false)
    setEditMode('none')
    setSelectedIds(new Set())
    setSelectedConditionIds(new Set())
  }, [keywordFilter, keywordSort, searchMode, searchQuery, selectedStockFilter])

  useEffect(() => {
    if (keywordFilter !== 'stock') {
      setStockSearchInput('')
      setStockSuggestions([])
      setShowStockSuggestions(false)
      setSelectedStockIndex(-1)
      setSelectedStockFilter(null)
    } else {
      setSearchQuery('')
    }
  }, [keywordFilter])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        stockSearchWrapperRef.current &&
        !stockSearchWrapperRef.current.contains(event.target as Node)
      ) {
        setShowStockSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (stockSearchTimerRef.current) {
        clearTimeout(stockSearchTimerRef.current)
      }
    }
  }, [])

  const fetchStockSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setStockSuggestions([])
      setShowStockSuggestions(false)
      setSelectedStockIndex(-1)
      setIsSearchingStocks(false)
      return
    }

    try {
      setIsSearchingStocks(true)
      const response = await fetch(
        `/api/stocks/search?q=${encodeURIComponent(query)}`
      )

      if (!response.ok) {
        throw new Error('stock search failed')
      }

      const data = (await response.json()) as {
        data?: Array<{
          ticker?: string
          symbol?: string
          companyName?: string
          longname?: string
        }>
      }

      const suggestions = (data.data ?? [])
        .map(item => ({
          ticker: item.ticker ?? item.symbol ?? '',
          companyName: item.companyName ?? item.longname ?? '',
        }))
        .filter(item => item.ticker)

      setStockSuggestions(suggestions)
      setShowStockSuggestions(suggestions.length > 0)
      setSelectedStockIndex(-1)
    } catch (error) {
      console.error('Failed to fetch stock suggestions:', error)
      setStockSuggestions([])
      setShowStockSuggestions(false)
      setSelectedStockIndex(-1)
    } finally {
      setIsSearchingStocks(false)
    }
  }, [])

  const handleStockInputChange = (value: string) => {
    const nextValue = value.toUpperCase()
    setStockSearchInput(nextValue)
    setSelectedStockFilter(null)

    if (stockSearchTimerRef.current) {
      clearTimeout(stockSearchTimerRef.current)
    }

    stockSearchTimerRef.current = setTimeout(() => {
      void fetchStockSuggestions(nextValue)
    }, 250)
  }

  const handleSelectStockSuggestion = (suggestion: StockSuggestion) => {
    setStockSearchInput(suggestion.ticker)
    setSelectedStockFilter(suggestion)
    setStockSuggestions([])
    setShowStockSuggestions(false)
    setSelectedStockIndex(-1)
  }

  const handleStockInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!showStockSuggestions || stockSuggestions.length === 0) {
      if (event.key === 'Escape') {
        setShowStockSuggestions(false)
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setSelectedStockIndex(prev =>
          prev < stockSuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        event.preventDefault()
        setSelectedStockIndex(prev => (prev > 0 ? prev - 1 : 0))
        break
      case 'Enter':
        event.preventDefault()
        if (selectedStockIndex >= 0) {
          handleSelectStockSuggestion(stockSuggestions[selectedStockIndex])
        }
        break
      case 'Escape':
        event.preventDefault()
        setShowStockSuggestions(false)
        break
      default:
        break
    }
  }

  const clearSelectedStockFilter = () => {
    setStockSearchInput('')
    setSelectedStockFilter(null)
    setStockSuggestions([])
    setShowStockSuggestions(false)
    setSelectedStockIndex(-1)
  }

  const baseFilteredKeywords = useMemo(() => {
    if (keywordFilter === 'stock') {
      if (stockSearchInput.trim() && !selectedStockFilter) return []
      if (!selectedStockFilter) return keywords

      return keywords.filter(keyword =>
        (keyword.overlays ?? []).some(
          overlay =>
            overlay.ticker.toUpperCase() ===
            selectedStockFilter.ticker.toUpperCase()
        )
      )
    }

    const languageFiltered =
      keywordFilter === 'all'
        ? keywords
        : filterKeywordsByLanguage(keywords, keywordFilter)

    return languageFiltered
  }, [keywordFilter, keywords, selectedStockFilter, stockSearchInput])

  const filteredKeywords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) return baseFilteredKeywords

    return baseFilteredKeywords.filter(keyword =>
      keyword.keyword.toLowerCase().includes(normalizedQuery)
    )
  }, [baseFilteredKeywords, searchQuery])

  const sortedKeywords = useMemo(() => {
    const copied = [...filteredKeywords]

    if (keywordSort === 'latest') {
      copied.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      return copied
    }

    if (keywordSort === 'name') {
      copied.sort((a, b) => a.keyword.localeCompare(b.keyword, 'ko'))
      return copied
    }

    return copied
  }, [filteredKeywords, keywordSort])

  const conditionEntries = useMemo<ConditionEntry[]>(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    const entries = baseFilteredKeywords.flatMap(keyword =>
      (keyword.analyses ?? []).map(analysis => {
        const conditionLabel = `${
          REGION_LABEL[analysis.region] ?? analysis.region
        } / ${SEARCH_TYPE_LABEL[analysis.search_type] ?? analysis.search_type}`

        return {
          id: analysis.id,
          keyword,
          analysis,
          label: `${keyword.keyword} - ${conditionLabel}`,
          conditionLabel,
          updatedAt:
            analysis.updated_at ??
            analysis.created_at ??
            keyword.updated_at ??
            keyword.created_at,
        }
      })
    )

    const queryFiltered = normalizedQuery
      ? entries.filter(
          entry =>
            entry.keyword.keyword.toLowerCase().includes(normalizedQuery) ||
            entry.conditionLabel.toLowerCase().includes(normalizedQuery) ||
            entry.label.toLowerCase().includes(normalizedQuery)
        )
      : entries

    if (keywordSort === 'latest') {
      return [...queryFiltered].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    }

    if (keywordSort === 'name') {
      return [...queryFiltered].sort((a, b) =>
        a.label.localeCompare(b.label, 'ko')
      )
    }

    return [...queryFiltered].sort(
      (a, b) =>
        (a.analysis.display_order ?? 0) - (b.analysis.display_order ?? 0) ||
        a.label.localeCompare(b.label, 'ko')
    )
  }, [baseFilteredKeywords, keywordSort, searchQuery])

  const tickerEntries = useMemo<ConditionEntry[]>(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const selectedTicker = selectedStockFilter?.ticker.toUpperCase()

    const entries = baseFilteredKeywords.flatMap(keyword =>
      (keyword.analyses ?? []).flatMap(analysis => {
        const conditionLabel = `${
          REGION_LABEL[analysis.region] ?? analysis.region
        } / ${SEARCH_TYPE_LABEL[analysis.search_type] ?? analysis.search_type}`

        return (analysis.overlays ?? [])
          .filter(
            overlay =>
              !selectedTicker || overlay.ticker.toUpperCase() === selectedTicker
          )
          .map(overlay => {
            const tickerLabel = `${overlay.ticker} · ${overlay.company_name}`

            return {
              id: `${analysis.id}:${overlay.id}`,
              keyword,
              analysis,
              overlay,
              label: `${keyword.keyword} - ${conditionLabel} - ${tickerLabel}`,
              conditionLabel,
              tickerLabel,
              updatedAt:
                analysis.updated_at ??
                analysis.created_at ??
                keyword.updated_at ??
                keyword.created_at,
            }
          })
      })
    )

    const queryFiltered = normalizedQuery
      ? entries.filter(
          entry =>
            entry.keyword.keyword.toLowerCase().includes(normalizedQuery) ||
            entry.conditionLabel.toLowerCase().includes(normalizedQuery) ||
            entry.tickerLabel?.toLowerCase().includes(normalizedQuery) ||
            entry.label.toLowerCase().includes(normalizedQuery)
        )
      : entries

    if (keywordSort === 'latest') {
      return [...queryFiltered].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    }

    if (keywordSort === 'name') {
      return [...queryFiltered].sort((a, b) =>
        a.label.localeCompare(b.label, 'ko')
      )
    }

    return [...queryFiltered].sort(
      (a, b) =>
        (a.analysis.display_order ?? 0) - (b.analysis.display_order ?? 0) ||
        (a.overlay?.display_order ?? 0) - (b.overlay?.display_order ?? 0) ||
        a.label.localeCompare(b.label, 'ko')
    )
  }, [
    baseFilteredKeywords,
    keywordSort,
    searchQuery,
    selectedStockFilter?.ticker,
  ])

  const displayedKeywords = useMemo(() => {
    return sortedKeywords.slice(0, displayCount)
  }, [displayCount, sortedKeywords])

  const displayedConditionEntries = useMemo(() => {
    return conditionEntries.slice(0, displayCount)
  }, [conditionEntries, displayCount])

  const displayedTickerEntries = useMemo(() => {
    return tickerEntries.slice(0, displayCount)
  }, [displayCount, tickerEntries])

  const activeDisplayCount =
    searchMode === 'keyword'
      ? displayedKeywords.length
      : searchMode === 'ticker'
        ? displayedTickerEntries.length
        : displayedConditionEntries.length

  // 무한스크롤 감지
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && activeDisplayCount === displayCount) {
          setDisplayCount(prev => prev + 100)
        }
      },
      { threshold: 0.1 }
    )

    if (lastElementRef.current) {
      observer.observe(lastElementRef.current)
    }

    return () => observer.disconnect()
  }, [activeDisplayCount, displayCount])

  const closeEditMode = () => {
    setIsEditMode(false)
    setEditMode('none')
    setSelectedIds(new Set())
    setSelectedConditionIds(new Set())
    setEditingId(null)
  }

  const handleToggleEditMode = () => {
    if (isEditMode) {
      closeEditMode()
      return
    }

    setIsEditMode(true)
    setEditMode('none')
    setSelectedIds(new Set())
    setEditingId(null)
  }

  const handleSelectDeleteMode = () => {
    setEditMode(prev => (prev === 'delete' ? 'none' : 'delete'))
    setSelectedIds(new Set())
    setSelectedConditionIds(new Set())
    setEditingId(null)
  }

  const handleSelectReorderMode = () => {
    if (
      keywordSort !== 'custom' ||
      keywordFilter !== 'all' ||
      searchQuery.trim()
    ) {
      toast.info('순서 변경은 전체 목록의 직접 설정순에서 사용할 수 있습니다.')
      return
    }

    setEditMode(prev => (prev === 'reorder' ? 'none' : 'reorder'))
    setSelectedIds(new Set())
    setSelectedConditionIds(new Set())
    setEditingId(null)
  }

  // 체크박스 토글
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleToggleConditionSelect = (id: string) => {
    setSelectedConditionIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 전체 선택 (현재 탭의 키워드만)
  const handleSelectAll = () => {
    setSelectedIds(new Set(displayedKeywords.map(k => k.id)))
  }

  const handleSelectAllConditions = () => {
    setSelectedConditionIds(
      new Set(displayedConditionEntries.map(entry => entry.id))
    )
  }

  // 키워드 삭제
  const handleDeleteKeyword = async () => {
    try {
      const idsToDelete =
        deleteTarget === 'selected' ? Array.from(selectedIds) : []

      if (idsToDelete.length === 0) return

      // 병렬로 삭제 요청
      await Promise.all(
        idsToDelete.map(deleteId =>
          apiFetch(`/api/keywords/${deleteId}`, {
            method: 'DELETE',
          })
        )
      )

      // 로컬 상태 업데이트
      const updated = keywords.filter(k => !idsToDelete.includes(k.id))
      setKeywords(updated)

      // 상태 초기화
      setSelectedIds(new Set())
      setDeleteTarget(null)
      if (editMode === 'delete') {
        setEditMode('none')
      }

      const message =
        deleteTarget === 'selected'
          ? `${idsToDelete.length}개 키워드가 삭제되었습니다.`
          : '키워드가 삭제되었습니다.'

      toast.success(message)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '삭제에 실패했습니다.'
      toast.error(message)
    }
  }

  const handleDeleteConditions = async () => {
    try {
      const idsToDelete = Array.from(selectedConditionIds)
      if (idsToDelete.length === 0) return

      await Promise.all(
        idsToDelete.map(analysisId =>
          apiFetch(`/api/analyses/${analysisId}`, {
            method: 'DELETE',
          })
        )
      )

      setKeywords(prev =>
        prev.map(keyword => ({
          ...keyword,
          analyses: (keyword.analyses ?? []).filter(
            analysis => !idsToDelete.includes(analysis.id)
          ),
        }))
      )
      setSelectedConditionIds(new Set())
      setConditionDeleteTarget(null)
      if (editMode === 'delete') {
        setEditMode('none')
      }

      toast.success(`${idsToDelete.length}개 조건이 삭제되었습니다.`)
      await fetchKeywords()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '조건 삭제에 실패했습니다.'
      toast.error(message)
    }
  }

  // 키워드 수정 저장
  const handleEditSave = async (id: string, newKeyword: string) => {
    try {
      const response = await apiFetch('/api/keywords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, keyword: newKeyword }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || '수정에 실패했습니다.')
      }

      // 로컬 상태 업데이트
      setKeywords(prev =>
        prev.map(k => (k.id === id ? { ...k, keyword: newKeyword } : k))
      )
      setEditingId(null)
      toast.success('키워드가 수정되었습니다.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '수정에 실패했습니다.'
      toast.error(message)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (editMode !== 'reorder' || !over || active.id === over.id) return

    if (searchMode === 'condition') {
      const oldIndex = displayedConditionEntries.findIndex(
        entry => entry.id === active.id
      )
      const newIndex = displayedConditionEntries.findIndex(
        entry => entry.id === over.id
      )

      if (oldIndex < 0 || newIndex < 0) return

      const reorderedVisible = arrayMove(
        displayedConditionEntries,
        oldIndex,
        newIndex
      )
      const displayedIdSet = new Set(
        displayedConditionEntries.map(entry => entry.id)
      )
      const reorderedQueue = [...reorderedVisible]
      const reorderedEntries = conditionEntries.map(entry => {
        if (!displayedIdSet.has(entry.id)) return entry

        return reorderedQueue.shift() ?? entry
      })
      const orderByAnalysisId = new Map(
        reorderedEntries.map((entry, index) => [entry.id, index + 1])
      )

      setKeywords(prev =>
        prev.map(keyword => ({
          ...keyword,
          analyses: (keyword.analyses ?? []).map(analysis => {
            const nextOrder = orderByAnalysisId.get(analysis.id)
            return nextOrder === undefined
              ? analysis
              : { ...analysis, display_order: nextOrder }
          }),
        }))
      )
      return
    }

    const oldIndex = displayedKeywords.findIndex(
      keyword => keyword.id === active.id
    )
    const newIndex = displayedKeywords.findIndex(
      keyword => keyword.id === over.id
    )

    if (oldIndex < 0 || newIndex < 0) return

    const reorderedVisible = arrayMove(displayedKeywords, oldIndex, newIndex)
    const displayedIdSet = new Set(displayedKeywords.map(keyword => keyword.id))
    const reorderedQueue = [...reorderedVisible]

    setKeywords(prev =>
      prev.map(keyword => {
        if (!displayedIdSet.has(keyword.id)) return keyword

        const next = reorderedQueue.shift()
        return next ?? keyword
      })
    )
  }

  const handleConfirmReorder = async () => {
    setIsSavingOrder(true)
    try {
      if (searchMode === 'condition') {
        const orderedIds = conditionEntries.map(entry => entry.id)
        await apiFetchJson('/api/analyses/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds }),
        })

        toast.success('조건 위치가 저장되었습니다.')
        closeEditMode()
        await fetchKeywords()
        return
      }

      const orderedIds = keywords.map(keyword => keyword.id)
      await apiFetchJson('/api/keywords/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      })

      toast.success('키워드 위치가 저장되었습니다.')
      closeEditMode()
      await fetchKeywords()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '위치 저장에 실패했습니다.'
      toast.error(message)
    } finally {
      setIsSavingOrder(false)
    }
  }

  const handleEditDone = () => {
    if (editMode === 'reorder') {
      void handleConfirmReorder()
      return
    }

    closeEditMode()
  }

  const handleRefreshKeyword = async (id: string) => {
    setRefreshingIds(prev => new Set(prev).add(id))

    try {
      await apiFetchJson(`/api/keywords/${id}/refreshes`, {
        method: 'POST',
      })
      await fetchKeywords()
      toast.success('키워드를 최신화했습니다.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '키워드 최신화에 실패했습니다.'
      toast.error(message)
    } finally {
      setRefreshingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // 헤더 영역
  const header = (
    <div className="mb-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">내 키워드</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            저장한 키워드의 검색 트렌드와 커스텀 비교 차트를 확인합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/keyword-analysis/new">
            <Button>
              <Search className="mr-2 h-4 w-4" />새 키워드 검색
            </Button>
          </Link>
        </div>
      </div>

      <div className="text-muted-foreground space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/30">
        <p className="text-sm">
          📊 Google Trends 데이터는 완료된 전주까지 수집됩니다.
        </p>
        <p className="text-sm">
          검색량 기반 지표, 13주 이동평균, 52주 전 대비 증감률은 주간 검색
          관심도 기준으로 계산됩니다.
        </p>
      </div>
    </div>
  )

  // 빈 상태 (로딩 완료 후에만 표시)
  if (!isLoading && keywords.length === 0) {
    return (
      <Container className="py-8">
        {header}
        <EmptyKeywordsState />
      </Container>
    )
  }

  // 데이터 있음
  return (
    <Container className="py-8 pb-24 sm:pb-8">
      {header}

      <div className="space-y-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { value: 'keyword', label: '키워드만' },
              { value: 'condition', label: '키워드 + 분석 조건' },
              { value: 'ticker', label: '키워드 + 분석 조건 + 티커 연동' },
            ].map(option => (
              <Button
                key={option.value}
                type="button"
                variant={searchMode === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSearchMode(option.value as SearchMode)
                  closeEditMode()
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
            <div className="relative">
              {keywordFilter === 'stock' ? (
                <div ref={stockSearchWrapperRef} className="relative">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    value={stockSearchInput}
                    onChange={event =>
                      handleStockInputChange(event.target.value)
                    }
                    onKeyDown={handleStockInputKeyDown}
                    placeholder="티커 또는 기업명으로 종목 검색"
                    className="pr-24 pl-9"
                    autoComplete="off"
                  />
                  <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
                    {isSearchingStocks && (
                      <ChevronsUpDown className="text-muted-foreground h-4 w-4 animate-pulse" />
                    )}
                    {selectedStockFilter && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearSelectedStockFilter}
                        className="h-7 px-2 text-xs"
                      >
                        초기화
                      </Button>
                    )}
                  </div>

                  {showStockSuggestions && stockSuggestions.length > 0 && (
                    <div className="bg-popover absolute top-full z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border shadow-md">
                      {stockSuggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.ticker}-${suggestion.companyName}`}
                          type="button"
                          onClick={() =>
                            handleSelectStockSuggestion(suggestion)
                          }
                          className="hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-left transition-colors"
                        >
                          <div className="min-w-0">
                            <div
                              className={cn(
                                'font-semibold',
                                index === selectedStockIndex && 'text-primary'
                              )}
                            >
                              {suggestion.ticker}
                            </div>
                            <div className="text-muted-foreground truncate text-xs">
                              {suggestion.companyName}
                            </div>
                          </div>
                          {selectedStockFilter?.ticker ===
                            suggestion.ticker && (
                            <Check className="h-4 w-4 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    placeholder={
                      searchMode === 'keyword'
                        ? '키워드 검색'
                        : searchMode === 'ticker'
                          ? '키워드, 분석 조건, 티커 검색'
                          : '키워드 또는 분석 조건 검색'
                    }
                    className="pl-9"
                  />
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: '전체' },
                { value: 'ko', label: '한글' },
                { value: 'en', label: '영어' },
                { value: 'symbol', label: '기타' },
                { value: 'stock', label: '종목' },
              ].map(option => (
                <Button
                  key={option.value}
                  type="button"
                  variant={
                    keywordFilter === option.value ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() =>
                    setKeywordFilter(option.value as KeywordFilter)
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <Select
              value={keywordSort}
              onValueChange={value => setKeywordSort(value as KeywordSort)}
            >
              <SelectTrigger className="h-9 w-full lg:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">직접 설정순</SelectItem>
                <SelectItem value="latest">최신순</SelectItem>
                <SelectItem value="name">이름순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="min-w-0">
          {keywords.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-muted-foreground text-sm">
                {activeDisplayCount}개 표시 중
                {keywordFilter === 'stock' && selectedStockFilter
                  ? ` · ${selectedStockFilter.ticker} 연결 키워드`
                  : ''}
              </div>

              {!isEditMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleEditMode}
                  disabled={activeDisplayCount === 0 || searchMode === 'ticker'}
                  className="border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  편집
                </Button>
              ) : editMode === 'none' ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectDeleteMode}
                    className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectReorderMode}
                    className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                  >
                    <GripVertical className="mr-2 h-4 w-4" />
                    순서 변경
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeEditMode}
                    disabled={isSavingOrder}
                    className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <X className="mr-2 h-4 w-4" />
                    완료
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditDone}
                  disabled={isSavingOrder}
                  className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <X className="mr-2 h-4 w-4" />
                  완료
                </Button>
              )}
            </div>
          )}

          {searchMode === 'keyword' &&
            editMode === 'delete' &&
            displayedKeywords.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    전체 선택
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
                    onClick={() => {
                      setDeleteTarget('selected')
                    }}
                    className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </Button>
                )}
              </div>
            )}

          {searchMode === 'condition' &&
            editMode === 'delete' &&
            displayedConditionEntries.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllConditions}
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    전체 선택
                  </Button>
                  {selectedConditionIds.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedConditionIds(new Set())}
                      className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      선택 해제
                    </Button>
                  )}
                  <span className="text-muted-foreground text-sm">
                    {selectedConditionIds.size}개 선택됨
                  </span>
                </div>
                {selectedConditionIds.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConditionDeleteTarget('selected')}
                    className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </Button>
                )}
              </div>
            )}

          {activeDisplayCount === 0 ? (
            <EmptyFilteredState />
          ) : searchMode === 'ticker' ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
              {displayedTickerEntries.map((entry, index) => {
                const isLastElement =
                  index === displayedTickerEntries.length - 1
                return (
                  <div
                    key={entry.id}
                    ref={isLastElement ? lastElementRef : null}
                  >
                    <KeywordConditionCard entry={entry} />
                  </div>
                )
              })}
            </div>
          ) : searchMode === 'condition' ? (
            editMode === 'reorder' ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={displayedConditionEntries.map(entry => entry.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
                    {displayedConditionEntries.map((entry, index) => {
                      const isLastElement =
                        index === displayedConditionEntries.length - 1
                      return (
                        <div
                          key={entry.id}
                          ref={isLastElement ? lastElementRef : null}
                        >
                          <SortableConditionCard entry={entry}>
                            <KeywordConditionCard
                              entry={entry}
                              mode="reorder"
                            />
                          </SortableConditionCard>
                        </div>
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
                {displayedConditionEntries.map((entry, index) => {
                  const isLastElement =
                    index === displayedConditionEntries.length - 1
                  return (
                    <div
                      key={entry.id}
                      ref={isLastElement ? lastElementRef : null}
                    >
                      <KeywordConditionCard
                        entry={entry}
                        mode={editMode === 'delete' ? 'delete' : 'normal'}
                        isSelected={selectedConditionIds.has(entry.id)}
                        onToggleSelect={handleToggleConditionSelect}
                      />
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            <>
              {editMode === 'reorder' ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={displayedKeywords.map(keyword => keyword.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {displayedKeywords.map((keyword, index) => {
                        const isLastElement =
                          index === displayedKeywords.length - 1
                        return (
                          <div
                            key={keyword.id}
                            ref={isLastElement ? lastElementRef : null}
                          >
                            <SortableKeywordCard keyword={keyword}>
                              <KeywordCard
                                keyword={keyword}
                                isManageMode
                                mode="reorder"
                                isSelected={false}
                                isEditing={false}
                              />
                            </SortableKeywordCard>
                          </div>
                        )
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {displayedKeywords.map((keyword, index) => {
                    const isLastElement = index === displayedKeywords.length - 1
                    return (
                      <div
                        key={keyword.id}
                        ref={isLastElement ? lastElementRef : null}
                      >
                        <KeywordCard
                          keyword={keyword}
                          isManageMode={editMode === 'delete'}
                          mode={editMode === 'delete' ? 'delete' : 'normal'}
                          isSelected={selectedIds.has(keyword.id)}
                          isEditing={editingId === keyword.id}
                          onToggleSelect={() => handleToggleSelect(keyword.id)}
                          onEditStart={() => setEditingId(keyword.id)}
                          onEditSave={handleEditSave}
                          onEditCancel={() => setEditingId(null)}
                          onRefresh={handleRefreshKeyword}
                          isRefreshing={refreshingIds.has(keyword.id)}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={open => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>선택한 키워드를 삭제하시겠어요?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 저장된 키워드 데이터가 영구적으로
              삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteKeyword()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={conditionDeleteTarget !== null}
        onOpenChange={open => {
          if (!open) {
            setConditionDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>선택한 조건을 삭제하시겠어요?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 선택한 저장 분석 조건과 연결된
              데이터가 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteConditions()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  )
}
