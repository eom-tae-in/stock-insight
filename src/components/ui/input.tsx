import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-tertiary selection:bg-primary selection:text-primary-foreground border-border bg-surface-raised hover:border-border-strong flex h-11 w-full min-w-0 rounded-md border px-3 text-[13px] leading-5 transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none',
        'focus-visible:border-primary focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
        'aria-invalid:border-danger',
        className
      )}
      {...props}
    />
  )
}

export { Input }
