import Link from 'next/link'
import { Activity } from 'lucide-react'
export function Brand({ href = '/' }: { readonly href?: string }) {
  return (
    <Link
      href={href}
      className="focus-visible:ring-ring inline-flex min-h-11 items-center gap-2.5 rounded-md font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <span className="bg-primary text-primary-foreground rounded-control flex size-8 items-center justify-center">
        <Activity aria-hidden className="size-5" />
      </span>
      <span className="text-base leading-6">StockInsight</span>
    </Link>
  )
}
