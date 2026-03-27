'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, Home } from 'lucide-react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 에러 로깅 (필요시 에러 추적 서비스에 전송)
    console.error('앱 에러:', error)
  }, [error])

  return (
    <div className="from-background to-muted flex min-h-screen flex-col items-center justify-center bg-gradient-to-b p-4">
      <div className="border-destructive/20 bg-card max-w-md rounded-lg border p-8 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="bg-destructive/10 rounded-full p-3">
            <AlertCircle className="text-destructive h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">문제가 발생했습니다</h1>
        </div>

        <p className="text-muted-foreground mb-6 text-sm">
          예상치 못한 오류가 발생했습니다. 페이지를 다시 시도하거나 홈으로
          돌아가세요.
        </p>

        {error.message && (
          <div className="bg-muted mb-6 rounded p-3">
            <p className="text-muted-foreground font-mono text-xs">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={reset}
            className="flex-1"
            aria-label="현재 페이지 다시 시도"
          >
            다시 시도
          </Button>
          <Link href="/" className="flex-1">
            <Button
              variant="outline"
              className="w-full"
              aria-label="홈으로 이동"
            >
              <Home className="mr-2 h-4 w-4" />홈
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
