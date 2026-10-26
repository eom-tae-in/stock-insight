import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GuideControls({
  current,
  count,
  onChange,
}: {
  readonly current: number
  readonly count: number
  readonly onChange: (step: number) => void
}) {
  return (
    <nav
      aria-label="카드 이동"
      className="bg-card z-10 flex h-20 items-center justify-between gap-2"
    >
      <div className="w-24 shrink-0 sm:w-28">
        {current > 1 && (
          <Button
            variant="secondary"
            className="w-full"
            size="mobile"
            onClick={() => onChange(current - 1)}
          >
            <ArrowLeft aria-hidden />
            이전
          </Button>
        )}
      </div>
      <p className="text-text-secondary text-sm tabular-nums">
        <span className="sr-only">전체 {count}장 중 </span>
        {current} / {count}
      </p>
      <div className="w-24 shrink-0 sm:w-28">
        {current < count && (
          <Button
            size="mobile"
            className="w-full"
            onClick={() => onChange(current + 1)}
          >
            다음
            <ArrowRight aria-hidden />
          </Button>
        )}
      </div>
    </nav>
  )
}
