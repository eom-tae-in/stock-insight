import type { ComponentProps } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'warning' | 'danger' | 'brand' | 'neutral'
export function StatusBadge({
  tone = 'neutral',
  dot = false,
  className,
  children,
  ...props
}: ComponentProps<'span'> & {
  readonly tone?: StatusTone
  readonly dot?: boolean
}) {
  return (
    <Badge
      {...props}
      variant={tone}
      className={cn(
        'h-[22px] gap-1.5 rounded-full px-2 py-0 text-xs leading-4 font-medium',
        className
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </Badge>
  )
}
