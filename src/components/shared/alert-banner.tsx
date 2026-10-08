import type { ReactNode } from 'react'
import { Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
const tones = {
  warning: 'bg-warning-subtle text-warning',
  error: 'bg-danger-subtle text-danger',
  info: 'bg-brand-subtle text-brand-text',
} as const
export function AlertBanner({
  tone,
  title,
  children,
  action,
}: {
  readonly tone: keyof typeof tones
  readonly title: string
  readonly children: ReactNode
  readonly action?: ReactNode
}) {
  const Icon = tone === 'info' ? Info : TriangleAlert
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-panel flex flex-wrap items-start gap-3 px-4 py-3.5',
        tones[tone]
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-5 font-semibold">{title}</p>
        <div className="text-text-secondary mt-1 text-[13px] leading-5 break-keep">
          {children}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
