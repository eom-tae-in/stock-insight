import type { Metadata } from 'next'
import { GuideReader } from '@/components/guides/guide-reader'
export const metadata: Metadata = {
  title: '서비스 사용법 | StockInsight',
  description:
    '종목과 키워드 저장부터 비교, 내 차트와 자료 확인까지 7장으로 알아보세요.',
}
export default async function GuidePage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly step?: string | string[] }>
}) {
  return <GuideReader journey="current" step={(await searchParams).step} />
}
