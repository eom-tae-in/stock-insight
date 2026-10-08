'use client'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
type IconButtonProps = Omit<
  ComponentProps<typeof Button>,
  'size' | 'variant' | 'aria-label'
> & {
  readonly label: string
  readonly size?: 'md' | 'sm' | 'mobile'
  readonly variant?: 'ghost' | 'secondary'
}
const sizes = { md: 'icon', sm: 'icon-sm', mobile: 'icon-mobile' } as const
export function IconButton({
  label,
  size = 'md',
  variant = 'ghost',
  ...props
}: IconButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            {...props}
            variant={variant}
            size={sizes[size]}
            aria-label={label}
          />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
