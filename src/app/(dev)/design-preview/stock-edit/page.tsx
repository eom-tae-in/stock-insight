import { notFound } from 'next/navigation'
import { StockEditShowcase } from '@/components/design-preview/stock-edit-showcase'

export default function StockEditPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <StockEditShowcase />
}
