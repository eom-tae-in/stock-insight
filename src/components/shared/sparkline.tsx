import { cn } from '@/lib/utils'
export function Sparkline({
  values,
  kind = 'price',
  size = 'list',
  label,
}: {
  readonly values: readonly (number | null)[]
  readonly kind?: 'price' | 'interest'
  readonly size?: 'list' | 'card'
  readonly label: string
}) {
  const points = values.slice(-52)
  const valid = points.filter(
    (value): value is number => value !== null && Number.isFinite(value)
  )
  if (valid.length < 2)
    return (
      <span
        className="text-text-secondary text-xs"
        role="img"
        aria-label={`${label}: 데이터 부족`}
      >
        —
      </span>
    )
  const min = Math.min(...valid),
    max = Math.max(...valid)
  const segments: { x: number; y: number }[][] = []
  let current: { x: number; y: number }[] = []
  points.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) {
      if (current.length) segments.push(current)
      current = []
      return
    }
    current.push({
      x: 2 + (index * 92) / Math.max(1, points.length - 1),
      y: max === min ? 16 : 28 - ((value - min) / (max - min)) * 24,
    })
  })
  if (current.length) segments.push(current)
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 96 32"
      preserveAspectRatio="none"
      className={cn(
        'shrink-0',
        size === 'card' ? 'h-12 w-full' : 'h-8 w-24',
        kind === 'price' ? 'text-text-secondary' : 'text-chart-interest'
      )}
    >
      <title>{label}</title>
      {segments
        .filter(segment => segment.length > 1)
        .map((segment, index) => {
          const start = segment[0],
            end = segment.at(-1)
          if (!start || !end) return null
          const path = segment
            .map((point, i) => `${i ? 'L' : 'M'}${point.x},${point.y}`)
            .join(' ')
          return (
            <g key={index}>
              <path
                d={`${path} L${end.x},30 L${start.x},30 Z`}
                fill="currentColor"
                opacity="0.14"
              />
              <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )
        })}
    </svg>
  )
}
