import { addDays, format, getISOWeek, getISOWeekYear, parseISO } from 'date-fns'
import { guideSeries, guideValue } from '@/lib/guides/chart-samples'
import type { GuidePoint, GuideSeries } from '@/lib/guides/chart-samples'

export function guideWeek(date: string): string {
  const day = parseISO(date)
  return `${getISOWeekYear(day)} W${String(getISOWeek(day)).padStart(2, '0')} · ${format(day, 'MM.dd')}–${format(addDays(day, 4), 'MM.dd')}`
}
export function GuideChartValues({
  point,
  series,
}: {
  readonly point: GuidePoint
  readonly series: readonly GuideSeries[]
}) {
  return (
    <>
      <p className="text-text-secondary mb-2 text-xs tabular-nums">
        {guideWeek(point.date)}
      </p>
      <dl className="space-y-2">
        {series.map(key => (
          <div
            key={key}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <dt className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-0.5 w-3"
                style={{ background: guideSeries[key].color }}
              />
              {guideSeries[key].label}
            </dt>
            <dd className="font-medium tabular-nums">
              {guideValue(key, point[key])}
            </dd>
          </div>
        ))}
      </dl>
    </>
  )
}
