import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table
        {...props}
        className={cn('w-full text-[13px] leading-5 tabular-nums', className)}
      />
    </div>
  )
}
export function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return <thead {...props} className={cn('[&_tr]:h-10', className)} />
}
export function TableBody(props: ComponentProps<'tbody'>) {
  return <tbody {...props} />
}
export function TableRow({
  className,
  density = 'data',
  ...props
}: ComponentProps<'tr'> & { readonly density?: 'data' | 'list' }) {
  return (
    <tr
      {...props}
      className={cn(
        'border-border-subtle hover:bg-surface-raised focus-within:outline-ring border-b focus-within:outline-2 focus-within:-outline-offset-2',
        density === 'list' ? 'h-16' : 'h-11',
        className
      )}
    />
  )
}
export function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      {...props}
      className={cn(
        'bg-surface-sunken text-tertiary h-10 px-4 text-left text-xs font-normal',
        className
      )}
    />
  )
}
export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td {...props} className={cn('px-4', className)} />
}
export function ListRow({ className, ...props }: ComponentProps<'a'>) {
  return (
    <a
      {...props}
      className={cn(
        'border-border-subtle hover:bg-surface-raised focus-visible:ring-ring flex min-h-16 items-center gap-3 border-b px-4 outline-none focus-visible:ring-2 focus-visible:ring-inset',
        className
      )}
    />
  )
}
