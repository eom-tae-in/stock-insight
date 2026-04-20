'use client'

import { Loader2 } from 'lucide-react'
import type { ProgressState } from '@/types'

const stageMessages: Record<ProgressState['stage'], string> = {
  idle: '조회할 종목을 입력해주세요',
  'fetching-price': '주가 데이터 수집 중...',
  'fetching-trends': 'Google Trends 데이터 수집 중...',
  calculating: '기술 지표 계산 중...',
  saving: '데이터 저장 중...',
  complete: '조회 완료',
  error: '오류 발생',
}

export function ProgressIndicator({ stage, message, error }: ProgressState) {
  const isLoading =
    stage !== 'idle' && stage !== 'complete' && stage !== 'error'
  const displayMessage = message || stageMessages[stage]

  return (
    <div className="bg-muted rounded-lg border border-blue-200 p-4 dark:border-blue-800">
      <div className="flex items-start gap-3">
        {isLoading && (
          <Loader2 className="text-primary mt-0.5 h-5 w-5 animate-spin" />
        )}
        <div className="flex-1">
          <p className="text-foreground text-sm font-medium">
            {displayMessage}
          </p>
          {error && <p className="text-destructive mt-1 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  )
}
