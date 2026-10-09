'use client'
import { useId, useState } from 'react'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/shared/segmented'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { useHydrated } from '@/hooks/use-hydrated'
import { cn } from '@/lib/utils'
import {
  SERIES_CONFIG,
  TIME_RANGE_PRESETS,
  type SeriesKey,
} from './stock-chart-config'

const order: readonly SeriesKey[] = [
  'close',
  'ma13',
  'yoy',
  'open',
  'high',
  'low',
]
export function StockChartControls({
  displayRange,
  customRange,
  availableWeeks,
  startDate,
  endDate,
  enabledSeries,
  onRangeChange,
  onCustomChange,
  onToggle,
  onDownload,
  downloading,
}: {
  readonly displayRange: number
  readonly customRange: string
  readonly availableWeeks: number
  readonly startDate?: string
  readonly endDate?: string
  readonly enabledSeries: Readonly<Record<SeriesKey, boolean>>
  readonly onRangeChange: (weeks: number) => void
  readonly onCustomChange: (value: string) => void
  readonly onToggle: (key: SeriesKey) => void
  readonly onDownload: () => void
  readonly downloading: boolean
}) {
  const hydrated = useHydrated()
  const weeksId = useId()
  const [directOpen, setDirectOpen] = useState(false)
  const custom = !TIME_RANGE_PRESETS.some(item => item.weeks === displayRange)
  const directButton = (
    <Button
      variant="ghost"
      disabled={!hydrated}
      aria-label="기간 직접 입력"
      aria-pressed={custom}
      className={cn(
        'h-9 px-3 text-xs md:h-7',
        custom && 'bg-brand-subtle text-brand-text'
      )}
    >
      직접
    </Button>
  )
  return (
    <>
      <header className="flex flex-wrap items-center gap-3 px-4 py-4 md:px-5">
        <div className="min-w-0 flex-1 basis-full md:basis-auto">
          <h3 className="text-base leading-6 font-semibold">가격 차트</h3>
          <p className="text-tertiary mt-0.5 text-xs leading-4">
            주간 종가 · 13주 이동평균 · 13주 MA 기준 52주 YoY
          </p>
        </div>
        <div className="bg-surface-raised flex min-w-0 flex-1 rounded-md p-[3px] md:flex-none">
          <Segmented
            label="가격 차트 기간"
            value={String(displayRange)}
            onValueChange={value => onRangeChange(Number(value))}
            options={TIME_RANGE_PRESETS.map(item => ({
              value: String(item.weeks),
              label: item.label,
            }))}
            className="min-w-0 flex-1 bg-transparent p-0 [&>button]:flex-1 [&>button]:px-2 md:[&>button]:px-3"
          />
          {hydrated ? (
            <Popover open={directOpen} onOpenChange={setDirectOpen}>
              <PopoverTrigger asChild>{directButton}</PopoverTrigger>
              <PopoverContent align="end" className="w-60 p-4">
                <label htmlFor={weeksId} className="text-sm font-medium">
                  표시할 주 수
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    id={weeksId}
                    type="number"
                    min="1"
                    max="260"
                    step="1"
                    value={customRange}
                    onChange={event => onCustomChange(event.target.value)}
                    placeholder="주"
                    aria-describedby={`${weeksId}-help`}
                  />
                  <span className="text-text-secondary text-xs">주</span>
                </div>
                <p
                  id={`${weeksId}-help`}
                  className="text-tertiary mt-2 text-xs"
                >
                  1–260주 · 기간을 바꾸면 종가만 표시해요.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setDirectOpen(false)}
                >
                  완료
                </Button>
              </PopoverContent>
            </Popover>
          ) : (
            directButton
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-mobile"
          className="md:size-[30px]"
          aria-label="통합 분석 차트를 PNG로 다운로드"
          onClick={onDownload}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <ImageIcon aria-hidden className="size-4" />
          )}
        </Button>
      </header>
      <div className="flex flex-wrap items-center gap-3 px-4 pb-3 md:px-5">
        <TooltipProvider>
          <div
            role="group"
            aria-label="차트 시리즈"
            className="flex flex-wrap gap-2"
          >
            {order.map(key => {
              const config = SERIES_CONFIG[key]
              const disabled =
                Math.min(displayRange, availableWeeks) < config.minWeeks
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={disabled ? 0 : undefined}
                      className="focus-visible:ring-ring rounded-control outline-none focus-visible:ring-2"
                    >
                      <Button
                        variant="ghost"
                        aria-label={config.name}
                        aria-pressed={enabledSeries[key] && !disabled}
                        disabled={disabled}
                        onClick={() => onToggle(key)}
                        className={cn(
                          'rounded-control h-9 gap-1.5 border px-2.5 text-xs md:h-7',
                          enabledSeries[key]
                            ? 'bg-surface-raised'
                            : 'text-text-secondary border-transparent'
                        )}
                      >
                        <span
                          aria-hidden
                          className="h-0.5 w-2.5 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        {key === 'yoy' ? '52주 YoY' : config.name}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {disabled && (
                    <TooltipContent>
                      {config.minWeeks}주 이상의 저장 데이터와 표시 기간이
                      필요해요.
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>
        <p className="text-tertiary text-xs tabular-nums md:ml-auto">
          {startDate?.slice(0, 7).replace('-', '.') ?? '—'} –{' '}
          {endDate?.slice(0, 7).replace('-', '.') ?? '—'} · {availableWeeks}주
        </p>
      </div>
    </>
  )
}
