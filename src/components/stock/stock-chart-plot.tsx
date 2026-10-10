'use client'
import { useId } from 'react'
import { addDays, format, getISOWeek, getISOWeekYear, parseISO } from 'date-fns'
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  Cell,
  ReferenceLine,
  ReferenceDot,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipContentProps,
  type LabelProps,
} from 'recharts'
import { useChartTheme } from '@/hooks/use-chart-theme'
import { ChangeText } from '@/components/shared/change-badge'
import { formatDisplayPrice } from '@/lib/format/display'
import { SERIES_CONFIG, type SeriesKey } from './stock-chart-config'

export type StockChartPoint = {
  readonly date: string
  readonly open: number | null
  readonly close: number
  readonly low: number | null
  readonly high: number | null
  readonly ma13: number | null
  readonly yoy: number | null
}
function LastPriceLabel({ viewBox, value }: LabelProps) {
  if (
    !viewBox ||
    !('x' in viewBox) ||
    !('y' in viewBox) ||
    typeof viewBox.x !== 'number' ||
    typeof viewBox.y !== 'number' ||
    typeof value !== 'string'
  )
    return <g />
  const width = Math.min(60, value.length * 6 + 12)
  return (
    <g
      data-last-price-label
      transform={`translate(${viewBox.x - width - 5},${viewBox.y})`}
    >
      <rect
        x={0}
        y={-9}
        width={width}
        height={18}
        rx={4}
        fill={SERIES_CONFIG.close.color}
      />
      <text
        x={6}
        y={4}
        fill="var(--background)"
        fontSize={11}
        textLength={value.length > 8 ? width - 12 : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {value}
      </text>
    </g>
  )
}
function weekLabel(value: string) {
  const parsed = parseISO(value)
  if (!Number.isFinite(parsed.getTime())) return '—'
  return `${getISOWeekYear(parsed)} W${getISOWeek(parsed)} · ${format(parsed, 'MM.dd')} – ${format(addDays(parsed, 4), 'MM.dd')}`
}
function PlotTooltip({
  active,
  label,
  data,
  currency,
  enabled,
}: TooltipContentProps & {
  readonly currency: string
  readonly data: readonly StockChartPoint[]
  readonly enabled: Readonly<Record<SeriesKey, boolean>>
}) {
  if (!active) return null
  const point = data.find(item => item.date === label)
  if (!point) return null
  return (
    <div
      role="tooltip"
      aria-label="주간 가격 상세"
      className="bg-popover text-popover-foreground shadow-popover min-w-44 rounded-md border px-3 py-2.5 text-xs"
    >
      <p className="text-tertiary mb-2">{weekLabel(point.date)}</p>
      <dl className="space-y-2">
        {(['close', 'ma13', 'yoy', 'open', 'high', 'low'] as const).map(
          key =>
            enabled[key] &&
            point[key] !== null && (
              <div key={key} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-0.5 w-2.5 rounded-full"
                  style={{ backgroundColor: SERIES_CONFIG[key].color }}
                />
                <dt className="text-text-secondary flex-1">
                  {key === 'yoy' ? '52주 YoY' : SERIES_CONFIG[key].name}
                </dt>
                <dd className="tabular-nums">
                  {key === 'yoy' ? (
                    <ChangeText value={point.yoy} className="text-xs" />
                  ) : (
                    formatDisplayPrice(point[key], currency)
                  )}
                </dd>
              </div>
            )
        )}
      </dl>
    </div>
  )
}
export function StockChartPlot({
  data,
  enabledSeries,
  currency,
}: {
  readonly data: StockChartPoint[]
  readonly enabledSeries: Readonly<Record<SeriesKey, boolean>>
  readonly currency: string
}) {
  const theme = useChartTheme()
  const unique = useId().replaceAll(':', '')
  const hasMA = enabledSeries.ma13 && data.length >= 13
  const hasYoY = enabledSeries.yoy && data.length >= 65
  const enabled = { ...enabledSeries, ma13: hasMA, yoy: hasYoY }
  const last = data.at(-1)
  const tooltip = (props: TooltipContentProps) => (
    <PlotTooltip {...props} currency={currency} enabled={enabled} data={data} />
  )
  const axisDate = (value: string) => value.slice(0, 7).replace('-', '.')
  return (
    <div
      role="group"
      aria-label="주간 가격과 52주 전년 대비 차트"
      className="space-y-1"
    >
      <div className="h-[230px] md:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            syncId={unique}
            syncMethod="value"
            margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id={`${unique}-price`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={SERIES_CONFIG.close.color}
                  stopOpacity={0.06}
                />
                <stop
                  offset="100%"
                  stopColor={SERIES_CONFIG.close.color}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={theme.gridColor} />
            <XAxis
              dataKey="date"
              hide={hasYoY}
              tickFormatter={axisDate}
              minTickGap={40}
              interval="preserveStartEnd"
              tick={{ fontSize: 11 }}
              height={24}
              stroke={theme.axisColor}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              orientation="right"
              width={64}
              tick={{ fontSize: 11 }}
              stroke={theme.axisColor}
              tickFormatter={value =>
                formatDisplayPrice(
                  typeof value === 'number' ? value : null,
                  currency
                )
              }
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              padding={{ top: 12, bottom: 12 }}
            />
            <Tooltip
              content={tooltip}
              cursor={{ stroke: theme.axisColor, strokeDasharray: '3 3' }}
            />
            {enabledSeries.close && (
              <Area
                yAxisId="left"
                dataKey="close"
                type="monotone"
                stroke="none"
                fill={`url(#${unique}-price)`}
                dot={false}
                isAnimationActive={false}
                name="종가 면"
              />
            )}
            {(['open', 'close', 'low', 'high'] as const).map(
              key =>
                enabledSeries[key] && (
                  <Line
                    key={key}
                    yAxisId="left"
                    type="monotone"
                    dataKey={key}
                    stroke={SERIES_CONFIG[key].color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name={SERIES_CONFIG[key].name}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                )
            )}
            {hasMA && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="ma13"
                stroke={SERIES_CONFIG.ma13.color}
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                name="13주 MA"
                isAnimationActive={false}
                connectNulls={false}
              />
            )}
            {enabledSeries.close && last && (
              <ReferenceDot
                yAxisId="left"
                x={last.date}
                y={last.close}
                r={0}
                label={{
                  value: formatDisplayPrice(last.close, currency),
                  content: LastPriceLabel,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {hasYoY && (
        <section aria-label="52주 YoY 막대" className="pt-1">
          <p className="text-tertiary mb-1 text-xs">52주 YoY</p>
          <div className="h-[110px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                syncId={unique}
                syncMethod="value"
                margin={{ top: 0, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke={theme.gridColor} />
                <XAxis
                  dataKey="date"
                  tickFormatter={axisDate}
                  minTickGap={40}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 11 }}
                  height={24}
                  stroke={theme.axisColor}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  width={64}
                  domain={[
                    (minimum: number) => Math.min(0, minimum),
                    (maximum: number) => Math.max(0, maximum),
                  ]}
                  tickFormatter={value => `${value}%`}
                  tick={{ fontSize: 11 }}
                  stroke={theme.axisColor}
                  tickLine={false}
                  axisLine={false}
                />
                <ReferenceLine yAxisId="right" y={0} stroke={theme.gridColor} />
                <Tooltip
                  content={() => null}
                  cursor={{ stroke: theme.axisColor, strokeDasharray: '3 3' }}
                />
                <Bar
                  yAxisId="right"
                  dataKey="yoy"
                  name="52주 YoY"
                  maxBarSize={5}
                  isAnimationActive={false}
                >
                  {data.map(point => (
                    <Cell
                      key={point.date}
                      fill={
                        point.yoy === null
                          ? 'transparent'
                          : point.yoy < 0
                            ? 'var(--down)'
                            : 'var(--up)'
                      }
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  )
}
