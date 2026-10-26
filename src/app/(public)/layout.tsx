import type { ReactNode } from 'react'
import { PublicHeader } from '@/components/guides/public-header'

export default function PublicLayout({
  children,
}: {
  readonly children: ReactNode
}) {
  return (
    <div className="bg-card min-h-dvh break-keep">
      <PublicHeader />
      {children}
    </div>
  )
}
