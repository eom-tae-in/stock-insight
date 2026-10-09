import { cn } from '@/lib/utils'
const colors = [
  'text-brand-text',
  'text-chart-series-a',
  'text-warning',
  'text-chart-series-c',
  'text-down',
  'text-text-secondary',
] as const
export function TickerLogo({
  ticker,
  size = 'md',
}: {
  readonly ticker: string
  readonly size?: 'md' | 'sm' | 'lg'
}) {
  const normalized = ticker.trim().toUpperCase()
  const hash = Array.from(normalized).reduce(
    (value, char) => (value * 31 + char.charCodeAt(0)) >>> 0,
    0
  )
  return (
    <span
      aria-hidden
      className={cn(
        'relative isolate inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold',
        size === 'sm' ? 'size-7' : size === 'lg' ? 'size-12' : 'size-9',
        colors[hash % colors.length]
      )}
    >
      <span className="absolute inset-0 -z-10 bg-current opacity-[0.16]" />
      {normalized.slice(0, 2)}
    </span>
  )
}
