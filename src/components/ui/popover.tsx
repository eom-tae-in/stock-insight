'use client'
import type { ComponentProps } from 'react'
import { Popover as Primitive } from 'radix-ui'
import { cn } from '@/lib/utils'
export const Popover = Primitive.Root
export const PopoverTrigger = Primitive.Trigger
export function PopoverContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        {...props}
        sideOffset={sideOffset}
        className={cn(
          'bg-popover text-popover-foreground shadow-popover rounded-panel z-50 border p-1.5 outline-none',
          className
        )}
      />
    </Primitive.Portal>
  )
}
