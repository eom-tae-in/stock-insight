'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type {
  KeywordRecord,
  SearchRecord,
  KeywordStockOverlay,
  TrendsDataPoint,
} from '@/types/database'
import { calculateTrendsMA13, calculateTrendsYoY } from '@/lib/indicators'
import { ApiRequestError, apiFetch, apiFetchJson } from '@/lib/fetch-client'
import { filterTrendsForTimeframe } from '@/lib/trends-filter'
import { normalizeKeywordSpacing } from '@/lib/utils/keyword-normalization'
import KeywordTrendsChart from './keyword-trends-chart'
import {
  TIMEFRAMES,
  TIMEFRAME_LABELS,
  TIMEFRAME_MAX_WEEKS,
  TIMEFRAME_VALUE_MAX_WEEKS,
  DEFAULT_TIMEFRAME,
  GEO_OPTIONS,
  GPROP_OPTIONS,
  DEFAULT_GEO,
  DEFAULT_TIMEFRAME_VALUE,
  DEFAULT_GPROP,
  type Timeframe,
  type TimeframeValue,
  type GeoValue,
  type GpropValue,
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
  savedKeywords: KeywordRecord[]
  geo: GeoValue
  gprop: GpropValue
}

type TrendsFetchStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'rate_limited'
  | 'error'

interface TrendsFetchErrorState {
  status: TrendsFetchStatus
  message: string | null
}

type KeywordOverlayResponse = KeywordStockOverlay & {
  analysis_id?: string
  companyName?: string
  displayOrder?: number
  chartData?: Array<{
    date: string
    normalizedPrice: number
    rawPrice: number
  }>
}

function overlayToSearchRecord(overlay: KeywordOverlayResponse): SearchRecord {
  return {
    id: overlay.id,
    user_id: '',
    ticker: overlay.ticker,
    company_name: overlay.company_name ?? overlay.companyName ?? overlay.ticker,
    price_data: (overlay.chartData ?? []).map(point => ({
      date: point.date,
      close: point.rawPrice,
    })),
    trends_data: [],
    searched_at: overlay.created_at ?? new Date().toISOString(),
    created_at: overlay.created_at,
  }
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
    geo: DEFAULT_GEO,
    gprop: DEFAULT_GPROP,
  })

  // UnifiedChart 방식: timeframe/customWeeks를 별도 state로 관리
  // 기간 변경 시 router 사용 없음 (스크롤 점프 방지)
  const [timeframe, setTimeframe] = useState<Timeframe | 'custom'>(
    DEFAULT_TIMEFRAME
  )
  const [customWeeks, setCustomWeeks] = useState(26)
  const [customWeeksInput, setCustomWeeksInput] = useState('26')
  const [fetchError, setFetchError] = useState<TrendsFetchErrorState>({
    status: 'idle',
    message: null,
  })
  const [reloadToken, setReloadToken] = useState(0)

  const searchTimeframeValue = DEFAULT_TIMEFRAME_VALUE

  const maxCustomWeeks = TIMEFRAME_VALUE_MAX_WEEKS[searchTimeframeValue]

  const availableTimeframes = useMemo(
    () => TIMEFRAMES.filter(tf => TIMEFRAME_MAX_WEEKS[tf] <= maxCustomWeeks),
    [maxCustomWeeks]
  )

  // 페이지 진입 시: URL 파라미터 읽기 + REST API로 데이터 조회
  // URL은 single source of truth → state 변경 시 URL 동기화 안 함
  useEffect(() => {
    // 1️⃣ URL 파라미터 읽기 (URL을 유일한 정보원으로 사용)
    const keyword = searchParams.get('keyword') || ''

    const geoParam = searchParams.get('geo')
    const geo: GeoValue =
      geoParam && GEO_OPTIONS.some(opt => opt.value === geoParam)
        ? (geoParam as GeoValue)
        : DEFAULT_GEO

    const tfValue: TimeframeValue = DEFAULT_TIMEFRAME_VALUE

    // TimeframeValue (대문자: 5Y) → Timeframe (소문자: 5y) 정규화
    const timeframeMap: Record<TimeframeValue, Timeframe | 'custom'> = {
      '1M': 'custom',
      '3M': 'custom',
      '12M': '1y',
      '1Y': '1y',
      '2Y': '2y',
      '3Y': '3y',
      '4Y': '4y',
      '5Y': '5y',
    }
    const tf = timeframeMap[tfValue]
    const maxWeeksForSearch = TIMEFRAME_VALUE_MAX_WEEKS[tfValue]

    const gpropParam = searchParams.get('gprop')
    const gprop: GpropValue =
      gpropParam && GPROP_OPTIONS.some(opt => opt.value === gpropParam)
        ? (gpropParam as GpropValue)
        : DEFAULT_GPROP

    if (!keyword) return

    // 2️⃣ state 업데이트 (렌더링용)
    setState(prev => ({
      ...prev,
      keyword,
      geo,
      gprop,
    }))
    setTimeframe(tf)
    if (tf === 'custom') {
      setCustomWeeks(maxWeeksForSearch)
      setCustomWeeksInput(String(maxWeeksForSearch))
    }

    // 3️⃣ REST API로 데이터 조회
    const fetchTrendsData = async () => {
      try {
        setFetchError({ status: 'loading', message: null })
        setState(prev => ({
          ...prev,
          isLoading: true,
          fullTrendsData: [],
          selectedSearches: [],
        }))

        const params = new URLSearchParams({
          keyword,
          geo,
          timeframe: tfValue,
          gprop,
        })
        const result = await apiFetchJson<{
          trendsData: TrendsDataPoint[]
          keyword: string
        }>(`/api/trends?${params.toString()}`)

        setState(prev => ({
          ...prev,
          fullTrendsData: result.trendsData,
          selectedSearches: [],
          isLoading: false,
        }))
        setFetchError({ status: 'success', message: null })
      } catch (error) {
        console.error('[keyword-trends-client] 에러:', error)
        if (
          error instanceof ApiRequestError &&
          error.code === 'PYTRENDS_RATE_LIMIT'
        ) {
          const message =
            'Google Trends 요청이 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.'
          toast.error(message)
          setFetchError({ status: 'rate_limited', message })
          setState(prev => ({
            ...prev,
            isLoading: false,
            fullTrendsData: [],
            selectedSearches: [],
          }))
          return
        }

        const message =
          error instanceof Error
            ? error.message
            : '데이터 조회 중 오류가 발생했습니다'
        toast.error(message)
        setFetchError({ status: 'error', message })
        setState(prev => ({
          ...prev,
          isLoading: false,
          fullTrendsData: [],
          selectedSearches: [],
        }))
      }
    }

    fetchTrendsData()
  }, [searchParams, reloadToken])

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

        // 1단계: 저장된 분석 목록 로드
        const analysesResult = await apiFetchJson<
          Array<{
            id: string
            region: GeoValue
            search_type: GpropValue
            period: string
          }>
        >(`/api/keywords/${keywordId}/analyses`)

        const analyses = Array.isArray(analysesResult) ? analysesResult : []
        if (analyses.length === 0) {
          throw new Error('No saved analyses found')
        }

        // 2단계: overlayId가 있으면 실제 소속 analysis를 찾고, 없으면 첫 분석 사용
        let activeAnalysis = analyses[0]
        let targetOverlays: KeywordOverlayResponse[] = []

        if (overlayId) {
          let matched = false

          for (const analysis of analyses) {
            const overlayResult = await apiFetchJson<KeywordOverlayResponse[]>(
              `/api/analyses/${analysis.id}/overlays`
            )
            const overlays = Array.isArray(overlayResult) ? overlayResult : []
            const target = overlays.filter(overlay => overlay.id === overlayId)

            if (target.length > 0) {
              activeAnalysis = analysis
              targetOverlays = target
              matched = true
              break
            }
          }

          if (!matched) {
            throw new Error('Overlay not found in saved analyses')
          }
        } else {
          const overlayResult = await apiFetchJson<KeywordOverlayResponse[]>(
            `/api/analyses/${activeAnalysis.id}/overlays`
          )
          targetOverlays = Array.isArray(overlayResult) ? overlayResult : []
        }

        const overlaySearches = targetOverlays.map(overlayToSearchRecord)

        // 3단계: 실제 저장 분석의 트렌드 데이터 복원
        const analysisResult = await apiFetchJson<{
          id: string
          trends_data: TrendsDataPoint[]
        }>(
          `/api/keywords/${keywordId}/analyses?region=${activeAnalysis.region}&searchType=${activeAnalysis.search_type}`
        )

        const raw = analysisResult?.trends_data
        if (!Array.isArray(raw)) throw new Error('Invalid analysis response')

        setState(prev => ({
          ...prev,
          keyword: keywordSearch.keyword,
          geo: activeAnalysis.region,
          gprop: activeAnalysis.search_type,
          fullTrendsData: raw as TrendsDataPoint[],
          selectedSearches: overlaySearches,
          isLoading: false,
        }))
        setTimeframe(DEFAULT_TIMEFRAME)

        // URL 업데이트 (keywordId 제거)
        const urlParams = new URLSearchParams({
          keyword: keywordSearch.keyword,
          geo: activeAnalysis.region,
          timeframe: DEFAULT_TIMEFRAME_VALUE,
          gprop: activeAnalysis.search_type,
        })
        router.push(`/keyword-analysis/search?${urlParams.toString()}`)

        toast.success(`"${keywordSearch.keyword}" 데이터를 복원했습니다`)
      } catch (error) {
        console.error('Error restoring keyword:', error)
        setState(prev => ({ ...prev, isLoading: false }))
        if (
          error instanceof ApiRequestError &&
          error.code === 'PYTRENDS_RATE_LIMIT'
        ) {
          toast.error(
            'Google Trends 요청이 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.'
          )
          return
        }

        toast.error('저장된 키워드를 불러오지 못했습니다')
      }
    }

    restoreKeywordFromId()
  }, [searchParams, state.savedKeywords, router])

  // customWeeks 변경 시 입력 필드 동기화
  useEffect(() => {
    setCustomWeeksInput(String(customWeeks))
  }, [customWeeks])

  useEffect(() => {
    if (customWeeks <= maxCustomWeeks) return

    setCustomWeeks(maxCustomWeeks)
  }, [customWeeks, maxCustomWeeks])

  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null)
  const isLoadingTrends = fetchError.status === 'loading'
  const hasFetchError =
    fetchError.status === 'rate_limited' || fetchError.status === 'error'
  const canShowSaveButton = !hasFetchError

  // 페이지 진입 시: 저장된 종목 목록 + 저장된 키워드 목록 로드
  useEffect(() => {
    fetchSavedKeywords()
  }, [])

  // 아키텍처 변경: trendsData는 fullTrendsData에서 필터링한 파생값
  // timeframe/customWeeks는 별도 state (UnifiedChart 방식)
  const trendsData = useMemo(
    () =>
      filterTrendsForTimeframe(state.fullTrendsData, timeframe, customWeeks),
    [state.fullTrendsData, timeframe, customWeeks]
  )

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

  // F027: 차트용 13주 이동평균 기준 52주 YoY 라인 값 배열
  const yoyValuesArray = useMemo(() => {
    const weeksInYear = 52
    return ma13Values.map((currentMA13, idx) => {
      if (idx < weeksInYear) return null
      const previousYearMA13 = ma13Values[idx - weeksInYear]
      if (
        currentMA13 === null ||
        previousYearMA13 === null ||
        previousYearMA13 === 0
      ) {
        return null
      }

      return (
        Math.round(
          ((currentMA13 - previousYearMA13) / previousYearMA13) * 100 * 100
        ) / 100
      )
    })
  }, [ma13Values])

  // P0-2: 401 처리를 apiFetchJson으로 위임
  const fetchSavedKeywords = async () => {
    try {
      const data = await apiFetchJson<KeywordRecord[]>('/api/keywords')
      setState(prev => ({
        ...prev,
        savedKeywords: Array.isArray(data) ? data : [],
      }))
    } catch (error) {
      console.error('Error fetching saved keywords:', error)
      toast.error('저장된 키워드를 불러오지 못했습니다')
    }
  }

  // 키워드 단독 저장 (차트 데이터 포함)
  const handleSaveKeyword = async () => {
    const trimmedKeyword = normalizeKeywordSpacing(state.keyword)
    if (!trimmedKeyword) {
      toast.error('키워드를 입력하세요')
      return
    }

    if (state.fullTrendsData.length === 0) {
      toast.error('먼저 키워드를 검색해주세요')
      return
    }

    setState(prev => ({ ...prev, isLoading: true }))

    try {
      // chartData 형식으로 변환 (fullTrendsData → chartData)
      // API에서 이미 계산된 ma13Value, yoyValue 사용
      const chartData = state.fullTrendsData.map((point, idx) => ({
        weekIndex: idx,
        date: point.date,
        trendsValue: point.value,
        ma13Value: point.ma13Value,
        yoyValue: point.yoyValue,
      }))

      await apiFetchJson('/api/keywords', {
        method: 'POST',
        body: JSON.stringify({
          keyword: trimmedKeyword,
          region: state.geo,
          period: DEFAULT_TIMEFRAME_VALUE,
          search_type: state.gprop,
          chartData, // 차트 데이터 포함
        }),
      })

      toast.success(`"${trimmedKeyword}" 키워드가 저장되었습니다`)

      // 저장된 키워드 목록 새로고침
      await fetchSavedKeywords()
    } catch (error) {
      console.error('[handleSaveKeyword] 에러:', error)
      toast.error(
        error instanceof Error ? error.message : '키워드 저장에 실패했습니다'
      )
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }

  // 기간 변경 시 스크롤 위치 유지 (state만 변경, URL은 timeframe 필터링용 state로 관리)
  const handleTimeframeChange = (tf: Timeframe | 'custom') => {
    setTimeframe(tf)
    // timeframe은 URL에 저장하지 않고 state 기반으로 필터링 (스크롤 점프 방지)
  }

  // 커스텀 주 수 적용 — 입력값 검증 후 확정
  const handleApplyCustomWeeks = () => {
    const weeks = parseInt(customWeeksInput, 10)
    if (isNaN(weeks) || weeks < 1 || weeks > maxCustomWeeks) {
      toast.error(`1~${maxCustomWeeks} 사이의 숫자를 입력하세요`)
      setCustomWeeksInput(String(customWeeks))
      return
    }
    setCustomWeeks(weeks)
    handleTimeframeChange('custom')
  }

  // 저장된 키워드 삭제 (확인 다이얼로그)
  const handleConfirmDelete = async (keywordSearchId: string) => {
    try {
      const res = await apiFetch(`/api/keywords/${keywordSearchId}`, {
        method: 'DELETE',
      })

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

  const handleRetryFetch = () => {
    setReloadToken(prev => prev + 1)
  }

  return (
    <div className="bg-background min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        {/* 헤더 - 뒤로가기 + 제목 + 버튼들 */}
        <div className="mb-8 space-y-5">
          <div className="border-border/60 bg-muted/30 flex flex-col gap-3 rounded-xl border p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                variant="outline"
                className="border-blue-200 bg-blue-50 text-blue-700 shadow-sm hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-950/50"
              >
                <Link href="/keyword-analysis">
                  <ChevronLeft className="h-4 w-4" />내 키워드로 돌아가기
                </Link>
              </Button>
              <Button
                onClick={() => router.push('/keyword-analysis/new')}
                variant="outline"
                className="border-blue-200 bg-blue-50 text-blue-700 shadow-sm hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-950/50"
              >
                키워드 검색하기
              </Button>
            </div>
            {canShowSaveButton && (
              <Button
                onClick={handleSaveKeyword}
                disabled={!state.keyword || state.isLoading}
                className="h-10"
              >
                {state.isLoading ? '저장중...' : '키워드 저장'}
              </Button>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold">키워드 트렌드 분석</h1>
            {state.keyword && (
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-muted-foreground text-sm font-medium">
                  검색 키워드:
                </span>
                <span className="text-foreground text-2xl font-bold">
                  {state.keyword}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* 지표 요약 */}
          {trendsData.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    13주 이동평균(13주 MA)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {currentMA13 !== null ? currentMA13.toFixed(2) : 'N/A'}
                  </p>
                </CardContent>
              </Card>

              {/* P1-7: 13주 이동평균 기준 52주 YoY 다크모드 색상 - dark: 프리픽스 추가 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    13주 이동평균 기준 전년동기 대비 증감률(52주 YoY)
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
                  {availableTimeframes.map(tf => (
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    minLength={1}
                    maxLength={String(maxCustomWeeks).length}
                    value={customWeeksInput}
                    onChange={e => {
                      const digitsOnly = e.target.value.replace(/\D/g, '')
                      if (!digitsOnly) {
                        setCustomWeeksInput('')
                        return
                      }

                      const nextWeeks = Math.min(
                        Number(digitsOnly),
                        maxCustomWeeks
                      )
                      setCustomWeeksInput(String(nextWeeks))
                    }}
                    onKeyDown={e => {
                      if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                        e.preventDefault()
                        return
                      }

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
                    (최대 {maxCustomWeeks}주)
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
            </>
          )}

          {isLoadingTrends && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="space-y-2">
                  <p className="text-lg font-semibold">
                    키워드 트렌드 데이터를 조회하는 중입니다
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Google Trends 응답을 기다리고 있습니다. 잠시만 기다려주세요.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {hasFetchError && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">
                      {fetchError.status === 'rate_limited'
                        ? '지금은 키워드 데이터를 바로 불러올 수 없습니다'
                        : '키워드 데이터를 불러오지 못했습니다'}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {fetchError.message ?? '잠시 후 다시 시도해주세요.'}
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button onClick={handleRetryFetch}>다시 시도</Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/keyword-analysis/new')}
                    >
                      다른 키워드 검색
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 빈 상태 */}
          {state.fullTrendsData.length === 0 &&
            !state.isLoading &&
            fetchError.status === 'idle' && (
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
