'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Container } from '@/components/layout/container'
import { SearchForm } from '@/components/search-form'
import { LoadingSkeleton } from '@/components/loading-skeleton'
import { ProgressIndicator } from '@/components/progress-indicator'
import { Button } from '@/components/ui/button'
import type { ProgressState, ApiResponse } from '@/types'

interface TickerCandidate {
  symbol: string
  longname: string
}

export default function SearchPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressState>({
    stage: 'idle',
    message: '',
  })
  const [candidates, setCandidates] = useState<TickerCandidate[]>([])
  const timerRefsRef = useRef<Array<NodeJS.Timeout>>([])

  // ticker 형식인지 확인 (/^[A-Z0-9.]{1,6}$/)
  const isTickerFormat = (input: string): boolean => {
    const upperInput = input.toUpperCase()
    return /^[A-Z0-9.]{1,6}$/.test(upperInput)
  }

  const performTickerSearch = async (ticker: string) => {
    setError(null)
    setCandidates([])
    setIsLoading(true)
    setProgress({ stage: 'fetching-price', message: '' })

    try {
      // 단계별 UI 진행 (더미 진행 표시)
      // NOTE: 실제 API는 동기 처리되므로, 이 타이머는 시각적 피드백만 제공합니다.
      // Phase 4에서 실시간 진행 상태(SSE/폴링)로 개선 예정입니다.
      const progressTimer1 = setTimeout(() => {
        setProgress({ stage: 'fetching-trends', message: '' })
      }, 2000)
      timerRefsRef.current.push(progressTimer1)

      const progressTimer2 = setTimeout(() => {
        setProgress({ stage: 'calculating', message: '' })
      }, 4000)
      timerRefsRef.current.push(progressTimer2)

      // POST /api/searches로 종목 조회 시작
      const response = await fetch('/api/searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticker }),
      })

      // 진행 상황 타이머 정리
      timerRefsRef.current.forEach(clearTimeout)
      timerRefsRef.current = []

      if (!response.ok) {
        const errorData = await response.json()
        const message =
          errorData.error?.message || '조회 중 오류가 발생했습니다'
        throw new Error(message)
      }

      const data: ApiResponse<{ id: string; ticker: string }> =
        await response.json()

      setProgress({
        stage: 'complete',
        message: `${ticker} 조회가 완료되었습니다.`,
      })

      // 1초 후 상세 페이지로 리다이렉트
      const redirectTimer = setTimeout(() => {
        router.push(`/analysis/${data.data.id}`)
      }, 1000)
      timerRefsRef.current.push(redirectTimer)
    } catch (err) {
      // 진행 상황 타이머 정리
      timerRefsRef.current.forEach(clearTimeout)
      timerRefsRef.current = []

      const message =
        err instanceof Error ? err.message : '조회 중 오류가 발생했습니다'
      setError(message)
      setProgress({
        stage: 'error',
        message: message,
        error: message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (input: string) => {
    setError(null)
    setCandidates([])

    // ticker 형식이 아니면 회사명 검색
    if (!isTickerFormat(input)) {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/ticker-search?q=${encodeURIComponent(input)}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error?.message || '검색에 실패했습니다')
        }

        const data = await response.json()
        setCandidates(data.data || [])

        if (data.data.length === 0) {
          setError('검색 결과가 없습니다')
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '검색 중 오류가 발생했습니다'
        setError(message)
      } finally {
        setIsLoading(false)
      }
      return
    }

    // ticker 형식이면 바로 조회
    const ticker = input.toUpperCase()
    await performTickerSearch(ticker)
  }

  const handleCandidateSelect = (symbol: string) => {
    performTickerSearch(symbol)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Container size="sm" className="py-16">
          <div className="mb-12 text-center">
            <h1 className="mb-3 text-3xl font-bold">새 종목 조회</h1>
            <p className="text-muted-foreground">
              특정 종목의 5년 가격 흐름과 대중 검색 관심도를 비교하여 투자
              판단을 지원합니다.
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              예시: AAPL, TSLA, MSFT
            </p>
          </div>

          {/* Ticker 입력 폼 */}
          <div className="mb-8">
            <SearchForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              error={error || undefined}
            />
          </div>

          {/* 회사명 검색 결과 (후보 목록) */}
          {candidates.length > 0 && !isLoading && (
            <div className="mb-8">
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-semibold">
                  검색 결과
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {candidates.map(candidate => (
                    <Button
                      key={candidate.symbol}
                      variant="outline"
                      className="h-auto flex-col items-start justify-start px-4 py-3"
                      onClick={() => handleCandidateSelect(candidate.symbol)}
                    >
                      <span className="font-bold">{candidate.symbol}</span>
                      <span className="text-muted-foreground text-xs">
                        {candidate.longname}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 진행 상태 표시 */}
          {progress.stage !== 'idle' && (
            <div className="mb-8">
              <ProgressIndicator
                stage={progress.stage}
                message={progress.message}
                error={progress.error}
              />
            </div>
          )}

          {/* 로딩 스켈레톤 */}
          {isLoading && <LoadingSkeleton />}
        </Container>
      </main>
    </div>
  )
}
