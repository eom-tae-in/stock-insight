/**
 * App Layout - 애플리케이션 페이지용 레이아웃
 * 전체 헤더 (네비게이션) 포함
 */

import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'

export const metadata: Metadata = {
  title: 'StockInsight - 로컬 주식 분석 도구',
  description:
    '특정 종목의 5년 가격 흐름과 Google Trends 검색 관심도를 비교하여 투자 판단을 지원하는 로컬 분석 도구',
}

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-24">{children}</main>
    </div>
  )
}
