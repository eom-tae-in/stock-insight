import { notFound } from 'next/navigation'
import { StockListShowcase } from '@/components/design-preview/stock-list-showcase'

export default function StockListPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <StockListShowcase />
}
