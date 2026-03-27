'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AnalysisError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('분석 페이지 에러:', error)
  }, [error])

  return (
    <div className="from-background to-muted flex min-h-screen flex-col items-center justify-center bg-gradient-to-b p-4">
      <div className="border-destructive/20 bg-card max-w-md rounded-lg border p-8 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="bg-destructive/10 rounded-full p-3">
            <AlertCircle className="text-destructive h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">
            분석 데이터를 로드할 수 없습니다
          </h1>
        </div>

        <p className="text-muted-foreground mb-6 text-sm">
          종목 데이터를 불러오는 중 오류가 발생했습니다. 존재하지 않는
          종목이거나 데이터가 손상되었을 수 있습니다.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={reset}
            className="flex-1"
            aria-label="분석 페이지 다시 시도"
          >
            다시 시도
          </Button>
          <Link href="/" className="flex-1">
            <Button
              variant="outline"
              className="w-full"
              aria-label="내 종목 목록으로 이동"
            >
              내 종목 목록
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
