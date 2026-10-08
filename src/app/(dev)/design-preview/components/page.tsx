import { notFound } from 'next/navigation'
import { ComponentShowcase } from '@/components/design-preview/component-showcase'

export default function DesignPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <ComponentShowcase />
}
