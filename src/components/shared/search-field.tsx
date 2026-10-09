'use client'
import { Search } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { Kbd } from './kbd'
import { cn } from '@/lib/utils'
export function SearchField({
  label,
  showShortcut = true,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type' | 'aria-label'> & {
  readonly showShortcut?: boolean
  readonly label: string
}) {
  return (
    <div className="relative">
      <Search
        aria-hidden
        className="text-tertiary pointer-events-none absolute top-[11px] left-3 size-4"
      />
      <Input
        {...props}
        type="search"
        aria-label={label}
        className={cn('h-[38px] pr-14 pl-9', className)}
      />
      {showShortcut && (
        <Kbd
          aria-hidden
          className="pointer-events-none absolute top-[9px] right-3 hidden md:inline-flex"
        >
          ⌘K
        </Kbd>
      )}
    </div>
  )
}
