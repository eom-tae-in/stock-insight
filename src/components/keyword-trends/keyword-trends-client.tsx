'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
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
import KeywordTrendsChart from './keyword-trends-chart'
import KeywordSearchList from './keyword-search-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ma13 / yoyChange 는 파생 값이므로 state에서 제거
interface KeywordTrendsState {
  keyword: string
  trendsData: TrendsDataPoint[]
  isLoading: boolean
  selectedSearches: SearchRecord[]
  savedKeywords: KeywordSearchRecord[]
  geo: string
  timeframe: string
  gprop: string
}

export default function KeywordTrendsClient() {
  const chartRef = useRef<HTMLDivElement>(null)

  const [state, setState] = useState<KeywordTrendsState>({
    keyword: '',
    trendsData: [],
    isLoading: false,
    selectedSearches: [],
    savedKeywords: [],
    geo: '',
    timeframe: '5y',
    gprop: '',
  })

  const [availableSearches, setAvailableSearches] = useState<SearchRecord[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')

  // P1-9: ma13 / yoyChange 를 useMemo로 파생 (단일 calculateTrendsMA13 호출)
  const ma13Values = useMemo(
    () => calculateTrendsMA13(state.trendsData),
    [state.trendsData]
  )

  const currentMA13 = useMemo(() => {
    if (ma13Values.length === 0) return null
    return ma13Values[ma13Values.length - 1]
  }, [ma13Values])

  const yoyChange = useMemo(
    () => calculateTrendsYoY(state.trendsData),
    [state.trendsData]
  )

  // 페이지 진입 시: 저장된 종목 목록 + 저장된 키워드 목록 로드
  useEffect(() => {
    fetchAvailableSearches()
    fetchSavedKeywords()
  }, [])

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

  // 키워드로 트렌드 조회 (F023: geo, timeframe, gprop 파라미터 지원)
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
        timeframe: state.timeframe,
        gprop: state.gprop,
      })

      const res = await apiFetch(`/api/trends?${params.toString()}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to fetch trends')
      }

      const data = await res.json()
      const trendsData = data.data.trendsData as TrendsDataPoint[]

      setState(prev => ({
        ...prev,
        keyword: trimmedKeyword,
        trendsData,
        selectedSearches: [],
        isLoading: false,
      }))

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

  // 오버레이할 주식 추가 (F026: 최대 5개로 확장)
  const handleAddOverlay = (searchId: string) => {
    const search = availableSearches.find(s => s.id === searchId)
    if (!search) return

    if (state.selectedSearches.length >= 5) {
      toast.error('최대 5개까지만 추가할 수 있습니다')
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

  // 현재 키워드 + 오버레이 조합 저장
  const handleSaveCombo = async () => {
    if (!state.keyword || state.trendsData.length === 0) {
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
          trendsData: state.trendsData,
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

      await Promise.all(
        state.selectedSearches.map((search, i) =>
          apiFetch(`/api/keyword-searches/${keywordSearchId}/overlays`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              searchId: search.id,
              displayOrder: i,
            }),
          }).then(overlayRes => {
            if (!overlayRes.ok)
              throw new Error(`Failed to save overlay: ${search.ticker}`)
          })
        )
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

  // P0-6: 경쟁 조건 수정 - 모든 데이터를 준비한 후 한 번에 setState
  const handleRestoreKeyword = async (keywordSearch: KeywordSearchRecord) => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const res = await apiFetch(
        `/api/keyword-searches/${keywordSearch.id}/overlays`
      )
      if (!res.ok) throw new Error('Failed to fetch overlays')

      const data = await res.json()
      const overlays = data.data as KeywordStockOverlay[]

      const overlaySearches = overlays
        .map(o => availableSearches.find(s => s.id === o.search_id))
        .filter(Boolean) as SearchRecord[]

      // 모든 데이터가 준비된 후 한 번에 업데이트
      setState(prev => ({
        ...prev,
        keyword: keywordSearch.keyword,
        trendsData: keywordSearch.trends_data,
        selectedSearches: overlaySearches,
        isLoading: false,
      }))

      toast.success(`"${keywordSearch.keyword}" 데이터를 복원했습니다`)
    } catch (error) {
      console.error('Error loading overlays:', error)
      setState(prev => ({ ...prev, isLoading: false }))
      toast.error('오버레이 데이터를 불러오지 못했습니다')
    }
  }

  // P0-3: PNG 메모리 누수 수정 - toBlob + URL.revokeObjectURL
  // P2-12: html-to-image 동적 임포트
  const handleDownloadPNG = async () => {
    if (!chartRef.current || !state.keyword) {
      toast.error('차트가 준비되지 않았습니다')
      return
    }

    setIsDownloading(true)
    try {
      const { toBlob } = await import('html-to-image')
      const blob = await toBlob(chartRef.current)
      if (!blob) throw new Error('이미지 생성에 실패했습니다')

      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `${state.keyword}-trends-${format(new Date(), 'yyyyMMdd')}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)

      toast.success('차트를 PNG로 다운로드했습니다')
    } catch (error) {
      console.error('Error downloading chart:', error)
      toast.error('차트 다운로드에 실패했습니다')
    } finally {
      setIsDownloading(false)
    }
  }

  // P0-4: Excel 오버레이 시트 Map 최적화 (이미 chart에서 동일 패턴 적용됨)
  // P2-12: xlsx 동적 임포트
  const handleDownloadExcel = async () => {
    if (!state.keyword || state.trendsData.length === 0) {
      toast.error('먼저 트렌드를 조회해주세요')
      return
    }

    try {
      const { write, utils } = await import('xlsx')
      const wb = utils.book_new()

      // Sheet 1: 트렌드 데이터 (P1-9: ma13Values는 이미 useMemo로 계산됨)
      const trendsSheet = state.trendsData.map((point, idx) => ({
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

        const overlaySheet = state.trendsData.map(trendPoint => {
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
        <h1 className="mb-8 text-3xl font-bold">키워드 트렌드 분석</h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* 좌측: 저장된 키워드 목록 */}
          <div className="lg:col-span-1">
            <KeywordSearchList
              keywords={state.savedKeywords}
              onRestore={handleRestoreKeyword}
              onDelete={setDeleteDialogId}
            />
          </div>

          {/* 우측: 입력 및 차트 */}
          <div className="space-y-6 lg:col-span-3">
            {/* 입력 섹션 */}
            <Card>
              <CardHeader>
                <CardTitle>키워드 검색</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="예: artificial intelligence, 전기차"
                    value={state.keyword}
                    onChange={e =>
                      setState(prev => ({ ...prev, keyword: e.target.value }))
                    }
                    onKeyDown={e => e.key === 'Enter' && handleSearchKeyword()}
                    disabled={state.isLoading}
                    maxLength={100}
                  />
                  <Button
                    onClick={handleSearchKeyword}
                    disabled={state.isLoading}
                    className="min-w-24"
                  >
                    {state.isLoading ? '로딩중...' : '조회'}
                  </Button>
                </div>

                {/* F023: 국가/기간/범위 선택 */}
                <div className="grid grid-cols-3 gap-3">
                  <Select
                    value={state.geo}
                    onValueChange={geo => setState(prev => ({ ...prev, geo }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="국가 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">전체</SelectItem>
                      <SelectItem value="US">미국</SelectItem>
                      <SelectItem value="KR">한국</SelectItem>
                      <SelectItem value="JP">일본</SelectItem>
                      <SelectItem value="CN">중국</SelectItem>
                      <SelectItem value="GB">영국</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={state.timeframe}
                    onValueChange={timeframe =>
                      setState(prev => ({ ...prev, timeframe }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="기간 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1y">1년</SelectItem>
                      <SelectItem value="3y">3년</SelectItem>
                      <SelectItem value="5y">5년</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={state.gprop}
                    onValueChange={gprop =>
                      setState(prev => ({ ...prev, gprop }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="검색범위 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">웹 검색</SelectItem>
                      <SelectItem value="youtube">유튜브</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 지표 요약 */}
            {state.trendsData.length > 0 && (
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

            {/* 차트 (P1-9: ma13Values를 prop으로 전달하여 chart 내부 중복 계산 방지) */}
            {state.trendsData.length > 0 && (
              <>
                <div ref={chartRef}>
                  <KeywordTrendsChart
                    trendsData={state.trendsData}
                    overlays={state.selectedSearches}
                    ma13Values={ma13Values}
                  />
                </div>

                {/* 오버레이 추가 */}
                <Card>
                  <CardHeader>
                    <CardTitle>종목 오버레이 추가 (최대 5개)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* F026: 종목 검색 필터 */}
                    <Input
                      placeholder="종목 검색 (Ticker 또는 회사명)"
                      value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)}
                      className="h-9"
                    />

                    <div className="flex gap-2">
                      <Select onValueChange={handleAddOverlay}>
                        <SelectTrigger>
                          <SelectValue placeholder="저장된 종목 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSearches
                            .filter(
                              search =>
                                !searchFilter ||
                                search.ticker
                                  .toLowerCase()
                                  .includes(searchFilter.toLowerCase()) ||
                                search.company_name
                                  .toLowerCase()
                                  .includes(searchFilter.toLowerCase())
                            )
                            .map(search => (
                              <SelectItem key={search.id} value={search.id}>
                                {search.ticker} - {search.company_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 선택된 오버레이 목록 */}
                    {state.selectedSearches.length > 0 && (
                      <div className="space-y-2">
                        {state.selectedSearches.map((search, idx) => (
                          <div
                            key={search.id}
                            className="bg-muted flex items-center justify-between rounded p-2"
                          >
                            <span className="text-sm font-medium">
                              {idx + 1}. {search.ticker} - {search.company_name}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveOverlay(search.id)}
                              aria-label={`${search.ticker} 오버레이 제거`}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 저장 버튼 */}
                    <Button
                      onClick={handleSaveCombo}
                      disabled={isSaving}
                      className="w-full"
                    >
                      {isSaving ? '저장중...' : '현재 조합 저장'}
                    </Button>
                  </CardContent>
                </Card>

                {/* F024, F025: 다운로드 섹션 */}
                <Card>
                  <CardHeader>
                    <CardTitle>다운로드</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={handleDownloadPNG}
                      disabled={isDownloading || state.trendsData.length === 0}
                      className="w-full"
                      variant="outline"
                    >
                      {isDownloading ? 'PNG 다운로드 중...' : 'PNG 다운로드'}
                    </Button>
                    <Button
                      onClick={handleDownloadExcel}
                      disabled={state.trendsData.length === 0}
                      className="w-full"
                      variant="outline"
                    >
                      Excel 다운로드
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* 빈 상태 */}
            {state.trendsData.length === 0 && !state.isLoading && (
              <Card>
                <CardContent className="text-muted-foreground py-12 text-center">
                  <p>키워드를 입력하여 트렌드를 분석하세요</p>
                </CardContent>
              </Card>
            )}
          </div>
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
