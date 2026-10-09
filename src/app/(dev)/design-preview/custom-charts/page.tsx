import { notFound } from 'next/navigation'
import { CustomChartsShowcase } from '@/components/design-preview/custom-charts-showcase'

export default function CustomChartsPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <CustomChartsShowcase />
}
