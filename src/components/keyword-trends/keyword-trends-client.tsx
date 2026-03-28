'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type {
  KeywordSearchRecord,
  SearchRecord,
  KeywordStockOverlay,
  TrendsDataPoint,
} from '@/types/database'
import { calculateTrendsMA13, calculateTrendsYoY } from '@/lib/indicators'
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

interface KeywordTrendsState {
  keyword: string
  trendsData: TrendsDataPoint[]
  ma13: number | null
  yoyChange: number | null
  isLoading: boolean
  selectedSearches: SearchRecord[] // 오버레이할 주식들
  savedKeywords: KeywordSearchRecord[]
}

export default function KeywordTrendsClient() {
  const [state, setState] = useState<KeywordTrendsState>({
    keyword: '',
    trendsData: [],
    ma13: null,
    yoyChange: null,
    isLoading: false,
    selectedSearches: [],
    savedKeywords: [],
  })

  const [availableSearches, setAvailableSearches] = useState<SearchRecord[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // 페이지 진입 시: 저장된 종목 목록 + 저장된 키워드 목록 로드
  useEffect(() => {
    fetchAvailableSearches()
    fetchSavedKeywords()
  }, [])

  // 저장된 종목 목록 조회
  const fetchAvailableSearches = async () => {
    try {
      const res = await fetch('/api/searches')
      if (!res.ok) throw new Error('Failed to fetch searches')
      const data = await res.json()
      setAvailableSearches(data.data || [])
    } catch (error) {
      console.error('Error fetching searches:', error)
    }
  }

  // 저장된 키워드 목록 조회
  const fetchSavedKeywords = async () => {
    try {
      const res = await fetch('/api/keyword-searches')
      if (!res.ok) throw new Error('Failed to fetch keyword searches')
      const data = await res.json()
      setState(prev => ({ ...prev, savedKeywords: data.data || [] }))
    } catch (error) {
      console.error('Error fetching saved keywords:', error)
    }
  }

  // 키워드로 트렌드 조회
  const handleSearchKeyword = async () => {
    const trimmedKeyword = state.keyword.trim()
    if (!trimmedKeyword) {
      toast.error('키워드를 입력하세요')
      return
    }

    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const res = await fetch(
        `/api/trends?keyword=${encodeURIComponent(trimmedKeyword)}`
      )
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to fetch trends')
      }

      const data = await res.json()
      const trendsData = data.data.trendsData as TrendsDataPoint[]

      // MA13, YoY 계산
      const ma13Values = calculateTrendsMA13(trendsData)
      const currentMA = ma13Values[ma13Values.length - 1]
      const yoy = calculateTrendsYoY(trendsData)

      setState(prev => ({
        ...prev,
        keyword: trimmedKeyword,
        trendsData,
        ma13: currentMA,
        yoyChange: yoy,
        selectedSearches: [], // 새 키워드 조회 시 오버레이 초기화
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

  // 오버레이할 주식 추가
  const handleAddOverlay = (searchId: string) => {
    const search = availableSearches.find(s => s.id === searchId)
    if (!search) return

    // 최대 3개 제한
    if (state.selectedSearches.length >= 3) {
      toast.error('최대 3개까지만 추가할 수 있습니다')
      return
    }

    // 중복 체크
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
      // 1. keyword_searches 저장
      const createRes = await fetch('/api/keyword-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: state.keyword,
          trendsData: state.trendsData,
          ma13: state.ma13,
          yoy_change: state.yoyChange,
        }),
      })

      if (!createRes.ok) {
        const error = await createRes.json()
        throw new Error(error.message || 'Failed to save keyword')
      }

      const createData = await createRes.json()
      const keywordSearchId = createData.data.id

      // 2. 오버레이 종목들 추가
      for (let i = 0; i < state.selectedSearches.length; i++) {
        const search = state.selectedSearches[i]
        await fetch(`/api/keyword-searches/${keywordSearchId}/overlays`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchId: search.id,
            displayOrder: i,
          }),
        })
      }

      toast.success('키워드와 오버레이 조합을 저장했습니다')

      // 저장된 키워드 목록 새로고침
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

  // 저장된 키워드 클릭 → 복원
  const handleRestoreKeyword = async (keywordSearch: KeywordSearchRecord) => {
    setState(prev => ({
      ...prev,
      keyword: keywordSearch.keyword,
      trendsData: keywordSearch.trends_data,
      ma13: keywordSearch.ma13 || null,
      yoyChange: keywordSearch.yoy_change || null,
      selectedSearches: [],
      isLoading: true,
    }))

    // 오버레이 로드
    try {
      const res = await fetch(
        `/api/keyword-searches/${keywordSearch.id}/overlays`
      )
      if (!res.ok) throw new Error('Failed to fetch overlays')

      const data = await res.json()
      const overlays = data.data as KeywordStockOverlay[]

      // search_id들로 searches 정보 조회
      const overlaySearches = overlays
        .map(o => availableSearches.find(s => s.id === o.search_id))
        .filter(Boolean) as SearchRecord[]

      setState(prev => ({
        ...prev,
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

  // 저장된 키워드 삭제
  const handleDeleteKeyword = async (keywordSearchId: string) => {
    if (!confirm('이 키워드를 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/keyword-searches?id=${keywordSearchId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete keyword')

      toast.success('키워드를 삭제했습니다')
      await fetchSavedKeywords()
    } catch (error) {
      console.error('Error deleting keyword:', error)
      toast.error('삭제에 실패했습니다')
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
              onDelete={handleDeleteKeyword}
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
                      {state.ma13 !== null ? state.ma13.toFixed(2) : 'N/A'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-muted-foreground text-sm font-medium">
                      52주 YoY
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      className={`text-2xl font-bold ${
                        state.yoyChange === null
                          ? 'text-gray-500'
                          : state.yoyChange >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                      }`}
                    >
                      {state.yoyChange !== null
                        ? `${state.yoyChange >= 0 ? '+' : ''}${state.yoyChange.toFixed(2)}%`
                        : 'N/A'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 차트 */}
            {state.trendsData.length > 0 && (
              <>
                <KeywordTrendsChart
                  trendsData={state.trendsData}
                  overlays={state.selectedSearches}
                />

                {/* 오버레이 추가 */}
                <Card>
                  <CardHeader>
                    <CardTitle>종목 오버레이 추가</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Select onValueChange={handleAddOverlay}>
                        <SelectTrigger>
                          <SelectValue placeholder="저장된 종목 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSearches.map(search => (
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
      </div>
    </div>
  )
}
