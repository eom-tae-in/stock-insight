import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GuideControls({
  current,
  count,
  onChange,
  onContents,
}: {
  readonly current: number
  readonly count: number
  readonly onChange: (step: number) => void
  readonly onContents: () => void
}) {
  return (
    <nav
      aria-label="카드 이동"
      className="bg-card z-10 flex h-20 items-center justify-between gap-2"
    >
      <Button
        variant="secondary"
        className="w-24 sm:w-28"
        size="mobile"
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
      >
        <ArrowLeft aria-hidden />
        이전
      </Button>
      <Button
        variant="ghost"
        size="mobile"
        onClick={onContents}
        aria-label={`목차 열기, ${count}장 중 ${current}장`}
        className="tabular-nums"
      >
        {current} / {count}
        <span className="hidden sm:inline">· 목차</span>
      </Button>
      <Button
        size="mobile"
        className="w-24 sm:w-28"
        onClick={() => (current < count ? onChange(current + 1) : onContents())}
      >
        {current < count ? '다음' : '목차'}
        <ArrowRight aria-hidden />
      </Button>
    </nav>
  )
}
