'use client'
import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
export function MetricTile({
  label,
  value,
  change,
  caption,
  info,
  size = 'md',
}: {
  readonly label: string
  readonly value: ReactNode
  readonly change?: ReactNode
  readonly caption?: string
  readonly info?: string
  readonly size?: 'md' | 'lg'
}) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="text-tertiary flex items-center gap-1.5 text-xs leading-4">
        {label}
        {info && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                aria-label={`${label} 설명`}
                className="focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2"
              >
                <Info aria-hidden className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>{info}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div
        className={cn(
          'text-foreground mt-2 font-semibold tabular-nums',
          size === 'lg'
            ? 'text-[28px] leading-9 tracking-[-0.02em]'
            : 'text-xl leading-7 tracking-[-0.01em]'
        )}
      >
        {value}
      </div>
      {(change || caption) && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {change}
          {caption && (
            <span className="text-tertiary text-xs leading-4">{caption}</span>
          )}
        </div>
      )}
    </div>
  )
}
