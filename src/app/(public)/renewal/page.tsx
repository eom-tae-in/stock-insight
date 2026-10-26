import type { Metadata } from 'next'
import { GuideReader } from '@/components/guides/guide-reader'
export const metadata: Metadata = {
  title: '리뉴얼 미리보기 | StockInsight',
  description:
    '사용자 문제에서 시작하는 화면 개선과 서비스 구조 개편의 방향, 진행 상황을 확인하세요.',
}
export default async function RenewalPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly step?: string | string[] }>
}) {
  return <GuideReader journey="renewal" step={(await searchParams).step} />
}
