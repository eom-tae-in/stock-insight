import type { ReactNode } from 'react'
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  readonly icon: ReactNode
  readonly title: string
  readonly description: string
  readonly action?: ReactNode
}) {
  return (
    <div className="bg-card flex flex-col items-center gap-3 rounded-lg border px-6 py-10 text-center">
      <div
        aria-hidden
        className="bg-surface-raised text-text-secondary rounded-panel flex size-12 items-center justify-center"
      >
        {icon}
      </div>
      <h3 className="text-base leading-6 font-semibold">{title}</h3>
      <p className="text-text-secondary max-w-sm text-[13px] leading-5 break-keep">
        {description}
      </p>
      {action}
    </div>
  )
}
