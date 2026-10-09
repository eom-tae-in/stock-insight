import { notFound } from 'next/navigation'
import { StockDetailShowcase } from '@/components/design-preview/stock-detail-showcase'

export default function StockDetailPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <StockDetailShowcase />
}
