'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import type { SearchFormProps } from '@/types'

interface TickerSuggestion {
  symbol: string
  longname: string
  isExactMatch?: boolean
}

const searchSchema = z.object({
  ticker: z
    .string()
    .min(1, '종목 심볼 또는 회사명을 입력해주세요')
    .max(50, '입력이 너무 깁니다')
    .transform(val => val.toUpperCase()),
})

type SearchFormData = z.infer<typeof searchSchema>

export function SearchForm({
  onSubmit,
  isLoading = false,
  error,
}: SearchFormProps) {
  const [localError, setLocalError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setLocalError(error || null)
  }, [error])

  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      ticker: '',
    },
  })

  // 정확도 기반 정렬: 정확한 ticker 매칭을 먼저 표시
  const sortSuggestionsByRelevance = useCallback(
    (results: TickerSuggestion[], query: string): TickerSuggestion[] => {
      const upperQuery = query.toUpperCase()

      return results.sort((a, b) => {
        // 정확한 ticker 매칭 (최우선)
        const aIsExactMatch = a.symbol === upperQuery
        const bIsExactMatch = b.symbol === upperQuery

        if (aIsExactMatch && !bIsExactMatch) return -1
        if (!aIsExactMatch && bIsExactMatch) return 1

        // ticker 시작 매칭
        const aStartsWithQuery = a.symbol.startsWith(upperQuery)
        const bStartsWithQuery = b.symbol.startsWith(upperQuery)

        if (aStartsWithQuery && !bStartsWithQuery) return -1
        if (!aStartsWithQuery && bStartsWithQuery) return 1

        // 회사명 시작 매칭
        const aNameStartsWithQuery = a.longname
          .toUpperCase()
          .startsWith(upperQuery)
        const bNameStartsWithQuery = b.longname
          .toUpperCase()
          .startsWith(upperQuery)

        if (aNameStartsWithQuery && !bNameStartsWithQuery) return -1
        if (!aNameStartsWithQuery && bNameStartsWithQuery) return 1

        return 0
      })
    },
    []
  )

  // Debounce된 자동완성 검색
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (query.length === 0) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      if (query.length < 1) {
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

          // 정확도 기반 정렬
          const sortedSuggestions = sortSuggestionsByRelevance(
            rawSuggestions,
            query
          )

          setSuggestions(sortedSuggestions)
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
    },
    [sortSuggestionsByRelevance]
  )

  const handleInputChange = (value: string) => {
    // 기존 타이머 취소
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 새로운 타이머 설정 (300ms debounce)
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)
  }

  const handleSelectSuggestion = async (symbol: string) => {
    form.setValue('ticker', symbol)
    setShowSuggestions(false)
    setSuggestions([])

    // 폼 제출
    setLocalError(null)
    try {
      await onSubmit(symbol)
    } catch (err) {
      const message = err instanceof Error ? err.message : '오류가 발생했습니다'
      setLocalError(message)
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

  // Suggestions 변경 시 선택된 인덱스 초기화
  useEffect(() => {
    setSelectedIndex(-1)
  }, [suggestions])

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex].symbol)
          setSelectedIndex(-1)
        }
        break
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleSubmit = async (data: SearchFormData) => {
    setLocalError(null)
    setShowSuggestions(false)
    try {
      await onSubmit(data.ticker)
    } catch (err) {
      const message = err instanceof Error ? err.message : '오류가 발생했습니다'
      setLocalError(message)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="w-full space-y-6"
      >
        <FormField
          control={form.control}
          name="ticker"
          render={({ field }) => (
            <FormItem className="relative">
              <FormControl>
                <Input
                  {...field}
                  ref={inputRef}
                  placeholder="예: AAPL, TSLA, MSFT 또는 회사명..."
                  disabled={isLoading}
                  autoComplete="off"
                  className="text-center text-lg"
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setShowSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    field.onBlur()
                    // 드롭다운 아이템 클릭 감지를 위해 약간의 지연 추가
                    setTimeout(() => setShowSuggestions(false), 150)
                  }}
                  onChange={e => {
                    field.onChange(e)
                    handleInputChange(e.target.value)
                  }}
                  onKeyDown={handleKeyDown}
                />
              </FormControl>

              {/* 자동완성 드롭다운 */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="bg-popover border-input absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border shadow-lg">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.symbol}
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion.symbol)}
                      className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors ${
                        selectedIndex === index
                          ? 'bg-accent'
                          : 'hover:bg-accent'
                      }`}
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

              <FormMessage />
            </FormItem>
          )}
        />

        {localError && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            {localError}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? '조회 중...' : '조회'}
        </Button>
      </form>
    </Form>
  )
}
