import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      {...props}
      className={cn(
        'border-border bg-card text-tertiary inline-flex h-5 items-center rounded-sm border px-1.5 font-sans text-[11px] leading-[14px] tabular-nums',
        className
      )}
    />
  )
}
