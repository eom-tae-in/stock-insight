'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  chartSamples,
  guideSeries,
  guideValue,
} from '@/lib/guides/chart-samples'
import type { GuideChartName, GuideSeries } from '@/lib/guides/chart-samples'
import { GuideChartValues, guideWeek } from './guide-chart-values'

export function GuideChart({ name }: { readonly name: GuideChartName }) {
  const sample = chartSamples[name]
  const id = useId()
  const [enabled, setEnabled] = useState<readonly GuideSeries[]>(sample.series)
  const [selected, setSelected] = useState(sample.data.length - 1)
  const point = sample.data[selected] ?? sample.data[0]
  const hasInterest = enabled.includes('interest')
  const hasPrice = enabled.some(key => guideSeries[key].axis === 'price')
  function toggle(key: GuideSeries) {
    setEnabled(current =>
      current.includes(key)
        ? current.length > 1
          ? current.filter(item => item !== key)
          : current
        : [...current, key]
    )
  }
  return (
    <section
      aria-label={sample.title}
      data-guide-chart
      onKeyDown={event => event.stopPropagation()}
      onTouchStart={event => event.stopPropagation()}
      onTouchEnd={event => event.stopPropagation()}
      className="min-w-0 space-y-4"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{sample.title}</h3>
        <p className="text-text-secondary text-xs leading-5">
          {sample.condition}
        </p>
      </div>
      <div
        role="group"
        aria-label="표시할 시리즈"
        className="flex flex-wrap gap-2"
      >
        {sample.series.map(key => (
          <Button
            variant={enabled.includes(key) ? 'secondary' : 'ghost'}
            size="mobile"
            key={key}
            type="button"
            aria-pressed={enabled.includes(key)}
            onClick={() => toggle(key)}
            className="gap-2 text-xs"
            disabled={enabled.length === 1 && enabled[0] === key}
          >
            <span
              aria-hidden
              className="h-0.5 w-3"
              style={{ background: guideSeries[key].color }}
            />
            {guideSeries[key].label}
            {enabled.includes(key) ? ' ✓' : ''}
          </Button>
        ))}
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-text-secondary">
          {hasInterest ? '관심도 · 0~100' : ''}
        </span>
        <span className="text-text-secondary">
          {hasPrice ? '주가 · USD' : ''}
        </span>
      </div>
      <div
        className="h-[260px] min-w-0"
        role="group"
        aria-label={`${sample.title} 그래프. 아래 주차 선택과 수치 표로도 확인할 수 있어요.`}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart
            data={sample.data}
            margin={{ top: 12, right: 4, bottom: 4, left: 0 }}
            accessibilityLayer
          >
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={date =>
                typeof date === 'string' ? date.slice(5).replace('-', '.') : ''
              }
              minTickGap={30}
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="interest"
              hide={!hasInterest}
              domain={[0, 100]}
              width={30}
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="price"
              hide={!hasPrice}
              orientation="right"
              domain={['auto', 'auto']}
              width={52}
              tickFormatter={value => `$${value}`}
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{
                stroke: 'var(--text-tertiary)',
                strokeDasharray: '3 3',
              }}
              content={({ active, label }) => {
                const hovered = sample.data.find(item => item.date === label)
                return active && hovered ? (
                  <div
                    role="tooltip"
                    aria-label="샘플 주간 값"
                    className="bg-popover text-popover-foreground shadow-popover min-w-48 rounded-md border p-3"
                  >
                    <GuideChartValues point={hovered} series={enabled} />
                  </div>
                ) : null
              }}
            />
            {enabled.map(key => (
              <Line
                key={key}
                dataKey={key}
                yAxisId={guideSeries[key].axis}
                name={guideSeries[key].label}
                stroke={guideSeries[key].color}
                strokeWidth={2}
                strokeDasharray={key === 'ma13' ? '5 3' : undefined}
                dot={sample.data.length <= 8 ? { r: 3 } : false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        <label htmlFor={id} className="text-text-secondary block text-xs">
          주차 선택
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={sample.data.length - 1}
          step={1}
          value={selected}
          onChange={event => setSelected(Number(event.target.value))}
          aria-valuetext={`${guideWeek(point.date)} ${enabled.map(key => `${guideSeries[key].label} ${guideValue(key, point[key])}`).join(', ')}`}
          className="accent-primary focus-visible:ring-ring h-11 w-full cursor-pointer rounded-md outline-none focus-visible:ring-2"
        />
        <div className="bg-card rounded-md border p-3">
          <GuideChartValues point={point} series={enabled} />
        </div>
      </div>
      <p className="text-text-secondary text-xs leading-5">{sample.lesson}</p>
      <details className="text-xs">
        <summary className="focus-visible:ring-ring min-h-11 cursor-pointer rounded-md py-3 outline-none focus-visible:ring-2">
          주간 수치를 표로 확인해요
        </summary>
        <div className="max-h-60 overflow-auto rounded-md border">
          <table className="w-full min-w-72 text-left tabular-nums">
            <caption className="sr-only">
              {sample.title} 설명용 주간 수치
            </caption>
            <thead className="bg-card sticky top-0">
              <tr>
                <th scope="col" className="p-2">
                  주 시작일
                </th>
                {sample.series.map(key => (
                  <th key={key} scope="col" className="p-2 text-right">
                    {guideSeries[key].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sample.data.map(row => (
                <tr key={row.date} className="border-t">
                  <th scope="row" className="p-2 font-normal">
                    {row.date}
                  </th>
                  {sample.series.map(key => (
                    <td key={key} className="p-2 text-right">
                      {guideValue(key, row[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="text-text-tertiary text-xs leading-5">
        설명용 정적 샘플이에요. 실제 시세나 Google Trends 관측값이 아니며
        실시간으로 갱신되지 않아요.
      </p>
    </section>
  )
}
