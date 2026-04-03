'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type {
  KeywordSearchRecord,
  SearchRecord,
  KeywordStockOverlay,
  TrendsDataPoint,
} from '@/types/database'
import { calculateTrendsMA13, calculateTrendsYoY } from '@/lib/indicators'
import { apiFetch, apiFetchJson } from '@/lib/fetch-client'
import { filterTrendsForTimeframe } from '@/lib/trends-filter'
import KeywordTrendsChart from './keyword-trends-chart'
import KeywordSearchForm from './keyword-search-form'
import OverlayManager from './overlay-manager'
import {
  TIMEFRAMES,
  TIMEFRAME_LABELS,
  DEFAULT_TIMEFRAME,
  type Timeframe,
} from '@/lib/constants/trends'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// 상태 구조: fullTrendsData와 기본 필터만 state에 보관
// timeframe/customWeeks는 별도 state로 분리 (UnifiedChart 방식)
interface KeywordTrendsState {
  keyword: string
  fullTrendsData: TrendsDataPoint[] // 5년 전체 원본 데이터
  isLoading: boolean
  selectedSearches: SearchRecord[]
  savedKeywords: KeywordSearchRecord[]
  geo: string
  gprop: string
}

export default function KeywordTrendsClient() {
  // F027: 각 timeframe별 ref 저장
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const router = useRouter()
  const searchParams = useSearchParams()

  const [state, setState] = useState<KeywordTrendsState>({
    keyword: '',
    fullTrendsData: [],
    isLoading: false,
    selectedSearches: [],
    savedKeywords: [],
    geo: '',
    gprop: '',
  })

  // UnifiedChart 방식: timeframe/customWeeks를 별도 state로 관리
  // 기간 변경 시 router 사용 없음 (스크롤 점프 방지)
  const [timeframe, setTimeframe] = useState<Timeframe | 'custom'>(
    DEFAULT_TIMEFRAME
  )
  const [customWeeks, setCustomWeeks] = useState(26)
  const [customWeeksInput, setCustomWeeksInput] = useState('26')

  // URL 파라미터에서 초기 상태 파싱 (F033: URL 파라미터 기반 상태 관리)
  useEffect(() => {
    const keyword = searchParams.get('keyword') || ''
    const geo = searchParams.get('geo') || ''
    const rawTimeframe = searchParams.get('timeframe')
    const tf =
      rawTimeframe && TIMEFRAMES.includes(rawTimeframe as Timeframe)
        ? (rawTimeframe as Timeframe)
        : DEFAULT_TIMEFRAME
    const gprop = searchParams.get('gprop') || ''

    if (keyword) {
      setState(prev => ({
        ...prev,
        keyword,
        geo,
        gprop,
      }))
      setTimeframe(tf)
    }
  }, [searchParams])

  // keywordId 파라미터로 저장된 키워드 복원
  useEffect(() => {
    const keywordId = searchParams.get('keywordId')
    const overlayId = searchParams.get('overlayId')
    if (!keywordId || state.savedKeywords.length === 0) return

    const restoreKeywordFromId = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }))

        // 저장된 키워드 찾기
        const keywordSearch = state.savedKeywords.find(k => k.id === keywordId)
        if (!keywordSearch) throw new Error('Keyword not found')

        // 1단계: 오버레이 데이터 로드
        const overlayRes = await apiFetch(
          `/api/keyword-searches/${keywordId}/overlays`
        )
        if (!overlayRes.ok) throw new Error('Failed to fetch overlays')

        const overlayData = await overlayRes.json()
        const overlays = overlayData.data as KeywordStockOverlay[]

        // overlayId가 있으면 해당 overlay만 필터링
        const targetOverlays = overlayId
          ? overlays.filter(o => o.id === overlayId)
          : overlays

        const overlaySearches = targetOverlays
          .map(o => availableSearches.find(s => s.id === o.search_id))
          .filter(Boolean) as SearchRecord[]

        // 2단계: 5y 데이터 재조회
        const params = new URLSearchParams({
          keyword: keywordSearch.keyword,
          geo: '',
          timeframe: '5y',
          gprop: '',
        })

        const res = await apiFetch(`/api/trends?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to fetch trends')

        const data = await res.json()
        const raw = data?.data?.trendsData
        if (!Array.isArray(raw)) throw new Error('Invalid response format')

        setState(prev => ({
          ...prev,
          keyword: keywordSearch.keyword,
          fullTrendsData: raw as TrendsDataPoint[],
          selectedSearches: overlaySearches,
          isLoading: false,
        }))
        setTimeframe(DEFAULT_TIMEFRAME)

        // URL 업데이트 (keywordId 제거)
        const urlParams = new URLSearchParams({
          keyword: keywordSearch.keyword,
          geo: '',
          timeframe: DEFAULT_TIMEFRAME,
          gprop: '',
        })
        router.push(`/trends/search?${urlParams.toString()}`)

        toast.success(`"${keywordSearch.keyword}" 데이터를 복원했습니다`)
      } catch (error) {
        console.error('Error restoring keyword:', error)
        setState(prev => ({ ...prev, isLoading: false }))
        toast.error('저장된 키워드를 불러오지 못했습니다')
      }
    }

    restoreKeywordFromId()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, state.savedKeywords, router])

  // customWeeks 변경 시 입력 필드 동기화
  useEffect(() => {
    setCustomWeeksInput(String(customWeeks))
  }, [customWeeks])

  const [availableSearches, setAvailableSearches] = useState<SearchRecord[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null)
  const [downloadingTimeframes, setDownloadingTimeframes] = useState<
    Set<string>
  >(new Set())
  const [searchFilter, setSearchFilter] = useState('')

  // 페이지 진입 시: 저장된 종목 목록 + 저장된 키워드 목록 로드
  useEffect(() => {
    fetchAvailableSearches()
    fetchSavedKeywords()
  }, [])

  // 아키텍처 변경: trendsData는 fullTrendsData에서 필터링한 파생값
  // timeframe/customWeeks는 별도 state (UnifiedChart 방식)
  const trendsData = useMemo(
    () =>
      filterTrendsForTimeframe(state.fullTrendsData, timeframe, customWeeks),
    [state.fullTrendsData, timeframe, customWeeks]
  )

  // Medium: URL 동기화 - geo/gprop 변경만 감지 (timeframe은 state 기반만)
  // timeframe/customWeeks 변경 시 router 호출 안 함 → 스크롤 점프 방지
  // (UnifiedChart와 동일한 방식)
  useEffect(() => {
    if (state.keyword && state.fullTrendsData.length > 0) {
      const params = new URLSearchParams({
        keyword: state.keyword,
        geo: state.geo,
        timeframe: DEFAULT_TIMEFRAME, // 기본값만 저장
        gprop: state.gprop,
      })
      router.replace(`/trends/search?${params.toString()}`, { scroll: false })
    }
  }, [
    state.geo,
    state.gprop,
    state.keyword,
    state.fullTrendsData.length, // 원본 데이터만 감시 (필터된 데이터 아님)
    router,
    // timeframe, customWeeks 제거 ← state 기반 필터링만
  ])

  // P1-9: ma13 / yoyChange 를 useMemo로 파생 (단일 calculateTrendsMA13 호출)
  const ma13Values = useMemo(
    () => calculateTrendsMA13(trendsData),
    [trendsData]
  )

  const currentMA13 = useMemo(() => {
    if (ma13Values.length === 0) return null
    return ma13Values[ma13Values.length - 1]
  }, [ma13Values])

  // Medium: ma13Values를 전달하여 중복 계산 제거
  const yoyChange = useMemo(
    () => calculateTrendsYoY(trendsData, ma13Values),
    [trendsData, ma13Values]
  )

  // F027: 차트용 52주 YoY 라인 값 배열 (각 포인트별 전년동기 대비 변화율)
  const yoyValuesArray = useMemo(() => {
    const weeksInYear = 52
    return trendsData.map((point, idx) => {
      if (idx < weeksInYear) return null
      const currentValue = point.value
      const previousYearValue = trendsData[idx - weeksInYear].value
      if (previousYearValue === 0) return null
      return ((currentValue - previousYearValue) / previousYearValue) * 100
    })
  }, [trendsData])

  // P0-2: 401 처리를 apiFetchJson으로 위임
  const fetchAvailableSearches = async () => {
    try {
      const data = await apiFetchJson<SearchRecord[]>('/api/searches')
      setAvailableSearches(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching searches:', error)
      toast.error('저장된 종목을 불러오지 못했습니다')
    }
  }

  const fetchSavedKeywords = async () => {
    try {
      const data = await apiFetchJson<KeywordSearchRecord[]>(
        '/api/keyword-searches'
      )
      setState(prev => ({
        ...prev,
        savedKeywords: Array.isArray(data) ? data : [],
      }))
    } catch (error) {
      console.error('Error fetching saved keywords:', error)
      toast.error('저장된 키워드를 불러오지 못했습니다')
    }
  }

  // 키워드로 트렌드 조회 — 아키텍처 변경: 5y 단일 fetch
  const handleSearchKeyword = async () => {
    const trimmedKeyword = state.keyword.trim()
    if (!trimmedKeyword) {
      toast.error('키워드를 입력하세요')
      return
    }

    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const params = new URLSearchParams({
        keyword: trimmedKeyword,
        geo: state.geo,
        timeframe: '5y', // 최대 기간만 한 번에 조회
        gprop: state.gprop,
      })

      const res = await apiFetch(`/api/trends?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch trends')

      const data = await res.json()
      const raw = data?.data?.trendsData
      if (!Array.isArray(raw)) throw new Error('Invalid response format')

      setState(prev => ({
        ...prev,
        keyword: trimmedKeyword,
        fullTrendsData: raw as TrendsDataPoint[],
        selectedSearches: [],
        isLoading: false,
      }))

      // URL 파라미터 업데이트
      const urlParams = new URLSearchParams({
        keyword: trimmedKeyword,
        geo: state.geo,
        timeframe: DEFAULT_TIMEFRAME,
        gprop: state.gprop,
      })
      router.push(`/trends/search?${urlParams.toString()}`)

      toast.success('트렌드 데이터를 가져왔습니다')
    } catch (error) {
      console.error('Error fetching trends:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : '트렌드 데이터를 가져오지 못했습니다'
      )
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }

  // 오버레이할 주식 추가 (F026: 최대 1개)
  const handleAddOverlay = (searchId: string) => {
    const search = availableSearches.find(s => s.id === searchId)
    if (!search) return

    if (state.selectedSearches.length >= 1) {
      toast.error('최대 1개까지만 추가할 수 있습니다')
      return
    }

    if (state.selectedSearches.some(s => s.id === searchId)) {
      toast.error('이미 추가된 종목입니다')
      return
    }

    setState(prev => ({
      ...prev,
      selectedSearches: [...prev.selectedSearches, search],
    }))

    toast.success(`${search.ticker} 오버레이를 추가했습니다`)
  }

  // 오버레이 제거
  const handleRemoveOverlay = (searchId: string) => {
    setState(prev => ({
      ...prev,
      selectedSearches: prev.selectedSearches.filter(s => s.id !== searchId),
    }))
  }

  // 새로운 종목 추가 (ticker-search에서 선택된 종목)
  const handleAddTickerOverlay = async (ticker: string) => {
    try {
      const response = await apiFetch(`/api/stock?ticker=${ticker}`)
      if (!response.ok) throw new Error('종목 데이터를 가져오지 못했습니다')

      const data = await response.json()
      const search = data.data as SearchRecord

      // availableSearches 업데이트
      setAvailableSearches(prev => [...prev, search])

      // 오버레이 추가
      handleAddOverlay(search.id)
      toast.success(`${ticker} 종목을 추가했습니다`)
    } catch (error) {
      console.error('Error adding ticker overlay:', error)
      toast.error('종목을 추가하지 못했습니다')
    }
  }

  // 현재 키워드 + 오버레이 조합 저장
  const handleSaveCombo = async () => {
    if (!state.keyword || trendsData.length === 0) {
      toast.error('먼저 트렌드를 조회해주세요')
      return
    }

    setIsSaving(true)

    try {
      const res = await apiFetch('/api/keyword-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: state.keyword,
          trendsData: trendsData,
          ma13: currentMA13,
          yoy_change: yoyChange,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to save keyword')
      }

      const createData = await res.json()
      const keywordSearchId = createData.data.id
      console.log('[handleSaveCombo] Keyword saved with ID:', keywordSearchId)
      console.log('[handleSaveCombo] Saving overlays:', {
        overlayCount: state.selectedSearches.length,
        searches: state.selectedSearches.map(s => ({
          id: s.id,
          ticker: s.ticker,
        })),
      })

      await Promise.all(
        state.selectedSearches.map((search, i) => {
          console.log(
            `[handleSaveCombo] Posting overlay ${i}:`,
            search.ticker,
            search.id
          )
          return apiFetch(`/api/keyword-searches/${keywordSearchId}/overlays`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              searchId: search.id,
              displayOrder: i,
            }),
          }).then(overlayRes => {
            if (!overlayRes.ok)
              throw new Error(`Failed to save overlay: ${search.ticker}`)
            console.log(`[handleSaveCombo] Overlay ${i} saved successfully`)
          })
        })
      )

      toast.success('키워드와 오버레이 조합을 저장했습니다')
      await fetchSavedKeywords()
    } catch (error) {
      console.error('Error saving combo:', error)
      toast.error(
        error instanceof Error ? error.message : '저장에 실패했습니다'
      )
    } finally {
      setIsSaving(false)
    }
  }

  // 저장된 키워드 복원 — 아키텍처 변경: 5y 단일 fetch
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRestoreKeyword = async (keywordSearch: KeywordSearchRecord) => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      // 1단계: 오버레이 데이터 로드
      const overlayRes = await apiFetch(
        `/api/keyword-searches/${keywordSearch.id}/overlays`
      )
      if (!overlayRes.ok) throw new Error('Failed to fetch overlays')

      const overlayData = await overlayRes.json()
      const overlays = overlayData.data as KeywordStockOverlay[]

      const overlaySearches = overlays
        .map(o => availableSearches.find(s => s.id === o.search_id))
        .filter(Boolean) as SearchRecord[]

      // 2단계: 5y 데이터 재조회
      const params = new URLSearchParams({
        keyword: keywordSearch.keyword,
        geo: '',
        timeframe: '5y',
        gprop: '',
      })

      const res = await apiFetch(`/api/trends?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch trends')

      const data = await res.json()
      const raw = data?.data?.trendsData
      if (!Array.isArray(raw)) throw new Error('Invalid response format')

      setState(prev => ({
        ...prev,
        keyword: keywordSearch.keyword,
        fullTrendsData: raw as TrendsDataPoint[],
        selectedSearches: overlaySearches,
        isLoading: false,
      }))
      setTimeframe(DEFAULT_TIMEFRAME)

      // URL 업데이트
      const urlParams = new URLSearchParams({
        keyword: keywordSearch.keyword,
        geo: '',
        timeframe: DEFAULT_TIMEFRAME,
        gprop: '',
      })
      router.push(`/trends/search?${urlParams.toString()}`)

      toast.success(`"${keywordSearch.keyword}" 데이터를 복원했습니다`)
    } catch (error) {
      console.error('Error loading overlays:', error)
      setState(prev => ({ ...prev, isLoading: false }))
      toast.error('오버레이 데이터를 불러오지 못했습니다')
    }
  }

  // P0-3: PNG 메모리 누수 수정 - toBlob + URL.revokeObjectURL
  // P2-12: html-to-image 동적 임포트
  // F027: timeframe 파라미터로 개별 차트 다운로드 지원 (타임프레임별 상태 분리)
  const handleDownloadPNG = async (timeframe: Timeframe | 'custom') => {
    const chartRef = chartRefs.current[timeframe]
    if (!chartRef || !state.keyword) {
      toast.error('차트가 준비되지 않았습니다')
      return
    }

    setDownloadingTimeframes(prev => new Set(prev).add(timeframe))
    try {
      const { toBlob } = await import('html-to-image')
      const blob = await toBlob(chartRef)
      if (!blob) throw new Error('이미지 생성에 실패했습니다')

      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      const timeframeLabel =
        timeframe === 'custom'
          ? `${customWeeks}w`
          : TIMEFRAME_LABELS[timeframe] || timeframe
      link.download = `${state.keyword}-trends-${timeframeLabel}-${format(new Date(), 'yyyyMMdd')}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)

      toast.success(`${timeframeLabel} 차트를 PNG로 다운로드했습니다`)
    } catch (error) {
      console.error('Error downloading chart:', error)
      toast.error('차트 다운로드에 실패했습니다')
    } finally {
      setDownloadingTimeframes(prev => {
        const next = new Set(prev)
        next.delete(timeframe)
        return next
      })
    }
  }

  // P0-4: Excel 오버레이 시트 Map 최적화 (이미 chart에서 동일 패턴 적용됨)
  // P2-12: xlsx 동적 임포트
  const handleDownloadExcel = async () => {
    if (!state.keyword || trendsData.length === 0) {
      toast.error('먼저 트렌드를 조회해주세요')
      return
    }

    try {
      const { write, utils } = await import('xlsx')
      const wb = utils.book_new()

      // Sheet 1: 트렌드 데이터 (P1-9: ma13Values는 이미 useMemo로 계산됨)
      const trendsSheet = trendsData.map((point, idx) => ({
        날짜: point.date,
        트렌드지수: point.value,
        MA13: ma13Values[idx] ?? null,
      }))
      utils.book_append_sheet(
        wb,
        utils.json_to_sheet(trendsSheet),
        '트렌드 데이터'
      )

      // Sheet 2~: 종목별 시트 (Map 기반 O(n+m) 최적화)
      state.selectedSearches.forEach(search => {
        const prices = search.price_data?.map(p => p.close) ?? []
        const min = prices.length > 0 ? Math.min(...prices) : 0
        const max = prices.length > 0 ? Math.max(...prices) : 0
        const range = max - min

        // 날짜 → 가격 Map 생성
        const priceMap = new Map<string, number>()
        search.price_data?.forEach(p => priceMap.set(p.date, p.close))

        const overlaySheet = trendsData.map(trendPoint => {
          const close = priceMap.get(trendPoint.date)
          const normalized =
            close !== undefined
              ? range === 0
                ? 50
                : Math.round(((close - min) / range) * 10000) / 100
              : null

          return {
            날짜: trendPoint.date,
            [search.ticker]: close ?? null,
            정규화가격: normalized,
          }
        })

        utils.book_append_sheet(
          wb,
          utils.json_to_sheet(overlaySheet),
          search.ticker
        )
      })

      const excelBuffer = write(wb, {
        bookType: 'xlsx',
        type: 'array',
        bookSST: false,
      })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${state.keyword}-trends-${format(new Date(), 'yyyyMMdd')}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('트렌드 데이터를 Excel로 다운로드했습니다')
    } catch (error) {
      console.error('Error downloading Excel:', error)
      toast.error('Excel 다운로드에 실패했습니다')
    }
  }

  // 기간 변경 시 스크롤 위치 유지 (강화된 복원 로직)
  // 기간 변경 — 아키텍처 변경으로 API 호출 없음 (스크롤 점프 제거)
  const handleTimeframeChange = (tf: Timeframe | 'custom') => {
    setTimeframe(tf)
  }

  // 커스텀 주 수 적용 — 입력값 검증 후 확정
  const handleApplyCustomWeeks = () => {
    const weeks = parseInt(customWeeksInput, 10)
    if (isNaN(weeks) || weeks < 1 || weeks > 260) {
      toast.error('1~260 사이의 숫자를 입력하세요')
      setCustomWeeksInput(String(customWeeks))
      return
    }
    setCustomWeeks(weeks)
    handleTimeframeChange('custom')
  }

  // 저장된 키워드 삭제 (확인 다이얼로그)
  const handleConfirmDelete = async (keywordSearchId: string) => {
    try {
      const res = await apiFetch(
        `/api/keyword-searches?id=${keywordSearchId}`,
        {
          method: 'DELETE',
        }
      )

      if (!res.ok) throw new Error('Failed to delete keyword')

      toast.success('키워드를 삭제했습니다')
      await fetchSavedKeywords()
    } catch (error) {
      console.error('Error deleting keyword:', error)
      toast.error('삭제에 실패했습니다')
    } finally {
      setDeleteDialogId(null)
    }
  }

  return (
    <div className="bg-background min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-2">
          <a
            href="/trends"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            ← 내 키워드로 돌아가기
          </a>
        </div>
        <h1 className="mb-8 text-3xl font-bold">키워드 트렌드 분석</h1>

        <div className="space-y-6">
          {/* 입력 섹션 */}
          <KeywordSearchForm
            keyword={state.keyword}
            geo={state.geo}
            timeframe={timeframe}
            gprop={state.gprop}
            isLoading={state.isLoading}
            onKeywordChange={keyword =>
              setState(prev => ({ ...prev, keyword }))
            }
            onGeoChange={geo => setState(prev => ({ ...prev, geo }))}
            onTimeframeChange={tf => {
              const validTimeframe = TIMEFRAMES.includes(tf as Timeframe)
                ? (tf as Timeframe)
                : DEFAULT_TIMEFRAME
              handleTimeframeChange(validTimeframe)
            }}
            onGpropChange={gprop => setState(prev => ({ ...prev, gprop }))}
            onSearch={handleSearchKeyword}
          />

          {/* 지표 요약 */}
          {trendsData.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    13주 이동평균
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {currentMA13 !== null ? currentMA13.toFixed(2) : 'N/A'}
                  </p>
                </CardContent>
              </Card>

              {/* P1-7: YoY 다크모드 색상 - dark: 프리픽스 추가 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    52주 YoY
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className={`text-2xl font-bold ${
                      yoyChange === null
                        ? 'text-gray-500 dark:text-gray-400'
                        : yoyChange >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {yoyChange !== null
                      ? `${yoyChange >= 0 ? '+' : ''}${yoyChange.toFixed(2)}%`
                      : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* F027: 통합 차트 (기간 선택으로 데이터 변경) */}
          {state.fullTrendsData.length > 0 && (
            <>
              {/* 기간 선택 버튼 + 커스텀 입력 */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {TIMEFRAMES.map(tf => (
                    <Button
                      key={tf}
                      onClick={() => handleTimeframeChange(tf)}
                      variant={timeframe === tf ? 'default' : 'outline'}
                      size="sm"
                    >
                      {TIMEFRAME_LABELS[tf]}
                    </Button>
                  ))}
                </div>

                {/* 커스텀 기간 입력 - 명시적 적용 */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="260"
                    value={customWeeksInput}
                    onChange={e => {
                      setCustomWeeksInput(e.target.value)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleApplyCustomWeeks()
                      }
                    }}
                    onFocus={e => e.target.select()}
                    className="border-input bg-background h-10 w-20 rounded border px-3 py-2 text-sm"
                    placeholder="주 수"
                  />
                  <Button
                    onClick={handleApplyCustomWeeks}
                    variant="outline"
                    size="sm"
                    className="h-10"
                  >
                    적용
                  </Button>
                  <span className="text-muted-foreground text-sm">주</span>
                  <span className="text-muted-foreground text-sm">
                    ({((customWeeks * 7) / 365).toFixed(2)}년)
                  </span>
                </div>
              </div>

              {/* 통합 차트 (기간별 데이터만 변경) */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {timeframe === 'custom'
                    ? `${customWeeks}주 트렌드 분석`
                    : `${TIMEFRAME_LABELS[timeframe]} 트렌드 분석`}
                </h3>
                <div className="flex gap-2">
                  {state.keyword && state.selectedSearches.length > 0 && (
                    <Button
                      onClick={handleSaveCombo}
                      disabled={isSaving}
                      size="sm"
                    >
                      {isSaving ? '저장 중...' : '조합 저장'}
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDownloadPNG(timeframe)}
                    disabled={downloadingTimeframes.has(timeframe)}
                    variant="outline"
                    size="sm"
                  >
                    {downloadingTimeframes.has(timeframe)
                      ? 'PNG 다운로드 중...'
                      : 'PNG 다운로드'}
                  </Button>
                </div>
              </div>

              <div
                ref={el => {
                  if (el) chartRefs.current[timeframe] = el
                }}
              >
                <KeywordTrendsChart
                  trendsData={trendsData}
                  overlays={state.selectedSearches}
                  ma13Values={ma13Values}
                  yoyValuesArray={yoyValuesArray}
                />
              </div>

              {/* 오버레이 추가 */}
              <OverlayManager
                selectedSearches={state.selectedSearches}
                availableSearches={availableSearches}
                searchFilter={searchFilter}
                onAddOverlay={handleAddOverlay}
                onRemoveOverlay={handleRemoveOverlay}
                onSearchFilterChange={setSearchFilter}
                onAddTickerOverlay={handleAddTickerOverlay}
              />

              {/* F024, F025: Excel 다운로드 섹션 */}
              <Card>
                <CardHeader>
                  <CardTitle>데이터 다운로드</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleDownloadExcel}
                    variant="outline"
                    className="w-full"
                  >
                    Excel 다운로드
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* 빈 상태 */}
          {state.fullTrendsData.length === 0 && !state.isLoading && (
            <Card>
              <CardContent className="text-muted-foreground py-12 text-center">
                <p>키워드를 입력하여 트렌드를 분석하세요</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 키워드 삭제 확인 다이얼로그 */}
        <AlertDialog
          open={deleteDialogId !== null}
          onOpenChange={(open: boolean) => !open && setDeleteDialogId(null)}
        >
          <AlertDialogContent>
            <AlertDialogTitle>키워드 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 키워드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deleteDialogId && handleConfirmDelete(deleteDialogId)
                }
              >
                삭제
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
