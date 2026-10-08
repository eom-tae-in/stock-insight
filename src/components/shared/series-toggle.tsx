'use client'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
export type SeriesTone =
  | 'price'
  | 'interest'
  | 'ma13'
  | 'series-a'
  | 'series-b'
  | 'series-c'
const colors = {
  price: 'bg-chart-price',
  interest: 'bg-chart-interest',
  ma13: 'bg-chart-ma13',
  'series-a': 'bg-chart-series-a',
  'series-b': 'bg-chart-series-b',
  'series-c': 'bg-chart-series-c',
} as const
export function SeriesToggle({
  selected,
  tone,
  onSelectedChange,
  className,
  children,
  ...props
}: Omit<ComponentProps<'button'>, 'onClick'> & {
  readonly selected: boolean
  readonly tone: SeriesTone
  readonly onSelectedChange: (selected: boolean) => void
}) {
  return (
    <button
      {...props}
      type="button"
      aria-pressed={selected}
      onClick={() => onSelectedChange(!selected)}
      className={cn(
        'hover:bg-surface-raised focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs leading-4 font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 md:h-7',
        selected
          ? 'bg-surface-raised border-border text-foreground'
          : 'text-tertiary border-transparent',
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-[3px] w-2.5 rounded-full',
          colors[tone],
          !selected && 'opacity-40'
        )}
      />
      {children}
    </button>
  )
}
