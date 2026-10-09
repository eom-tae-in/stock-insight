'use client'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/shared/segmented'
import { TextField } from '@/components/shared/text-field'
import { CUSTOM_CHART_SERIES } from '@/lib/custom-charts'
import { cn } from '@/lib/utils'

export function CustomChartFields({
  name,
  onNameChange,
  weeks,
  onWeeksChange,
  series,
  onSeriesChange,
  removed,
  error,
  busy,
}: {
  readonly name: string
  readonly onNameChange: (value: string) => void
  readonly weeks: number
  readonly onWeeksChange: (value: number) => void
  readonly series: readonly string[]
  readonly onSeriesChange: (key: string) => void
  readonly removed: readonly string[]
  readonly error: string
  readonly busy: boolean
}) {
  return (
    <div className="space-y-5">
      <TextField
        label="차트 이름"
        placeholder="예: 최근 1년 가격 추이"
        value={name}
        onChange={event => onNameChange(event.target.value)}
        disabled={busy}
        error={error || undefined}
      />
      <fieldset className="space-y-2">
        <legend className="text-text-secondary mb-2 text-xs">기간</legend>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="기간 선택"
            value={String(weeks)}
            onValueChange={value => onWeeksChange(Number(value))}
            disabled={busy}
            options={[1, 2, 3, 4, 5].map(year => ({
              value: String(year * 52),
              label: `${year}년`,
            }))}
          />
          <span className="text-tertiary text-xs">또는</span>
          <label className="flex items-center gap-2 text-xs">
            <Input
              aria-label="주 수"
              className="h-9 w-20 tabular-nums"
              type="number"
              min={1}
              max={260}
              value={weeks}
              onChange={event =>
                onWeeksChange(
                  Math.min(
                    260,
                    Math.max(1, Number.parseInt(event.target.value, 10) || 1)
                  )
                )
              }
              disabled={busy}
            />
            주 <span className="text-tertiary">1–260주</span>
          </label>
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-text-secondary mb-2 text-xs">
          포함할 시리즈
        </legend>
        <div className="divide-border-subtle divide-y overflow-hidden rounded-md border">
          {CUSTOM_CHART_SERIES.map(item => {
            const available = weeks >= item.minWeeks
            return (
              <label
                key={item.key}
                className="flex min-h-12 items-center gap-3 px-3.5 py-3"
              >
                <Checkbox
                  aria-label={item.label}
                  checked={series.includes(item.key)}
                  disabled={busy || !available}
                  onCheckedChange={() => onSeriesChange(item.key)}
                  aria-describedby={`series-${item.key}-help`}
                />
                <span
                  aria-hidden
                  className={cn(
                    'h-[3px] w-3.5 shrink-0 rounded-sm',
                    item.color,
                    !available && 'opacity-40'
                  )}
                />
                <span
                  className={cn(
                    'w-20 shrink-0 text-sm',
                    !available && 'text-tertiary'
                  )}
                >
                  {item.label}
                </span>
                <span
                  id={`series-${item.key}-help`}
                  className="text-tertiary min-w-0 text-xs leading-4"
                >
                  {item.minWeeks ? `최소 ${item.minWeeks}주` : '최소 기간 없음'}
                  {!available &&
                    ` · 지금 기간(${weeks}주)에서는 고를 수 없어요`}
                  {removed.includes(item.key) && (
                    <span className="text-warning block" role="status">
                      기간이 줄어 선택을 해제했어요
                    </span>
                  )}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
