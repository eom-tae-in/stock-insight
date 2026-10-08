import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] leading-5 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 active:brightness-95",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-brand-hover',
        primary: 'bg-primary text-primary-foreground hover:bg-brand-hover',
        danger:
          'border border-transparent bg-danger-subtle text-danger hover:border-danger',
        destructive:
          'border border-transparent bg-danger-subtle text-danger hover:border-danger',
        outline:
          'border border-border bg-surface-raised text-foreground hover:bg-border',
        secondary:
          'border border-border bg-surface-raised text-foreground hover:bg-border',
        ghost: 'bg-transparent text-foreground hover:bg-surface-raised',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-3.5',
        md: 'h-9 px-3.5',
        sm: 'h-[30px] rounded-control px-2.5 text-xs leading-4',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9 p-0',
        'icon-sm': 'size-[30px] rounded-control p-0',
        mobile: 'h-11 px-3.5',
        'icon-mobile': 'size-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    readonly asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
