import { notFound } from 'next/navigation'
import { ShellShowcase } from '@/components/design-preview/shell-showcase'
export default function ShellPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <ShellShowcase />
}
