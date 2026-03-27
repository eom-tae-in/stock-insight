'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Container } from '@/components/layout/container'
import { SearchForm } from '@/components/search-form'
import { LoadingSkeleton } from '@/components/loading-skeleton'
import { ProgressIndicator } from '@/components/progress-indicator'
import type { ProgressState, ApiResponse } from '@/types'

export default function SearchPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressState>({
    stage: 'idle',
    message: '',
  })
  const timerRefsRef = useRef<Array<NodeJS.Timeout>>([])

  const handleSubmit = async (ticker: string) => {
    setIsLoading(true)
    setError(null)
    setProgress({ stage: 'fetching-price', message: '' })

    try {
      // 단계별 UI 진행 (실제 API는 동기 처리)
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
