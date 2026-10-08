'use client'
import type { ComponentProps } from 'react'
import { Tabs as Primitive } from 'radix-ui'
import { cn } from '@/lib/utils'
export const Tabs = Primitive.Root
export function TabsList({
  className,
  ...props
}: ComponentProps<typeof Primitive.List>) {
  return (
    <Primitive.List
      {...props}
      className={cn(
        'border-border flex h-11 items-center gap-5 border-b',
        className
      )}
    />
  )
}
export function TabsTrigger({
  className,
  ...props
}: ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      {...props}
      className={cn(
        'text-tertiary hover:text-text-secondary data-[state=active]:text-foreground data-[state=active]:border-primary focus-visible:ring-ring focus-visible:ring-offset-background h-11 border-b-2 border-transparent text-sm leading-5 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
    />
  )
}
export function TabsContent({
  className,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content
      {...props}
      className={cn(
        'focus-visible:ring-ring pt-4 outline-none focus-visible:ring-2',
        className
      )}
    />
  )
}
