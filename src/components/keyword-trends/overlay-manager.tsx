'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SearchRecord } from '@/types/database'

interface TickerSuggestion {
  symbol: string
  longname: string
}

interface OverlayManagerProps {
  selectedSearches: SearchRecord[]
  availableSearches: SearchRecord[]
  searchFilter: string
  isSaving: boolean
  onAddOverlay: (searchId: string) => void
  onRemoveOverlay: (searchId: string) => void
  onSearchFilterChange: (value: string) => void
  onSaveCombo: () => void
  onAddTickerOverlay?: (ticker: string) => void // 새 종목 추가용
}

export default function OverlayManager({
  selectedSearches,
  availableSearches,
  searchFilter,
  isSaving,
  onAddOverlay,
  onRemoveOverlay,
  onSearchFilterChange,
  onSaveCombo,
  onAddTickerOverlay,
}: OverlayManagerProps) {
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Debounce된 자동완성 검색
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length === 0) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `/api/ticker-search?q=${encodeURIComponent(query)}`
      )

      if (response.ok) {
        const data = await response.json()
        const rawSuggestions: TickerSuggestion[] = data.data || []
        setSuggestions(rawSuggestions)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err)
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleInputChange = (value: string) => {
    onSearchFilterChange(value)

    // 기존 타이머 취소
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 새로운 타이머 설정 (300ms debounce)
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)
  }

  const handleSelectSuggestion = (ticker: string) => {
    setShowSuggestions(false)
    setSuggestions([])

    // 저장된 종목에서 찾기
    const existingSearch = availableSearches.find(
      s => s.ticker.toUpperCase() === ticker.toUpperCase()
    )

    if (existingSearch) {
      onAddOverlay(existingSearch.id)
    } else if (onAddTickerOverlay) {
      // 새로운 종목 추가 (keyword-trends-client에서 처리)
      onAddTickerOverlay(ticker)
    }
  }

  // 클릭 바깥쪽 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>종목 오버레이 추가 (최대 5개)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* F026: 종목 검색 필터 + 검색 제안 */}
        <div className="relative">
          <Input
            ref={inputRef}
            placeholder="종목 검색 (Ticker 또는 회사명)"
            value={searchFilter}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true)
              }
            }}
            className="h-9"
          />

          {/* 자동완성 드롭다운 */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="bg-popover border-input absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border shadow-lg">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion.symbol}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion.symbol)}
                  className="hover:bg-accent flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {suggestion.symbol}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {suggestion.longname}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 검색 중 상태 */}
          {showSuggestions && isSearching && suggestions.length === 0 && (
            <div className="bg-popover border-input absolute top-full right-0 left-0 z-50 mt-1 rounded-md border shadow-lg">
              <div className="text-muted-foreground px-4 py-3 text-sm">
                검색 중...
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Select onValueChange={onAddOverlay}>
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
        {selectedSearches.length > 0 && (
          <div className="space-y-2">
            {selectedSearches.map((search, idx) => (
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
                  onClick={() => onRemoveOverlay(search.id)}
                  aria-label={`${search.ticker} 오버레이 제거`}
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* 저장 버튼 */}
        <Button onClick={onSaveCombo} disabled={isSaving} className="w-full">
          {isSaving ? '저장중...' : '현재 조합 저장'}
        </Button>
      </CardContent>
    </Card>
  )
}
