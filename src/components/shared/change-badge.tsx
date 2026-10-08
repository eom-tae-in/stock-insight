'use client'

import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { formatChange, type ChangeKind } from '@/lib/format/display'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type ChangeProps = Omit<ComponentProps<'span'>, 'children'> & {
  readonly value: number | null
  readonly kind?: ChangeKind
  readonly missingReason?: string
}

function ChangeValue({
  value,
  kind = 'percent',
  missingReason = '계산에 필요한 데이터가 없어요.',
  className,
  soft,
  ...props
}: ChangeProps & { readonly soft: boolean }) {
  const missing = value === null || !Number.isFinite(value)
  const tone = missing || value === 0 ? 'flat' : value > 0 ? 'up' : 'down'
  const content = (
    <span
      {...props}
      tabIndex={missing ? 0 : props.tabIndex}
      data-change={tone}
      className={cn(
        'inline-flex items-center text-[13px] leading-5 font-medium whitespace-nowrap tabular-nums',
        tone === 'up'
          ? 'text-up'
          : tone === 'down'
            ? 'text-down'
            : 'text-text-secondary',
        soft && 'h-[22px] rounded-sm px-1.5',
        soft &&
          (tone === 'up'
            ? 'bg-up-subtle'
            : tone === 'down'
              ? 'bg-down-subtle'
              : 'bg-surface-raised'),
        className
      )}
    >
      {formatChange(value, kind)}
    </span>
  )
  if (!missing) return content
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>{missingReason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function ChangeBadge(props: ChangeProps) {
  return <ChangeValue {...props} soft />
}
export function ChangeText(props: ChangeProps) {
  return <ChangeValue {...props} soft={false} />
}
