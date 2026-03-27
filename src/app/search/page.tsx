'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Container } from '@/components/layout/container'
import { SearchForm } from '@/components/search-form'
import { LoadingSkeleton } from '@/components/loading-skeleton'
import { ProgressIndicator } from '@/components/progress-indicator'
import type { ProgressState } from '@/types'

export default function SearchPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressState>({
    stage: 'idle',
    message: '',
  })

  const handleSubmit = async (ticker: string) => {
    setIsLoading(true)
    setError(null)
    setProgress({ stage: 'fetching-price', message: '' })

    try {
      // Phase 3: 실제 API 호출로 교체 예정
      // 여기서는 더미 데이터 표시만 함
      await new Promise(resolve => setTimeout(resolve, 500))
      setProgress({
        stage: 'complete',
        message: `${ticker} 조회가 완료되었습니다. (더미 데이터)`,
      })
    } catch (err) {
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
