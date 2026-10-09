/**
 * App Layout - 애플리케이션 페이지용 레이아웃
 * 전체 헤더 (네비게이션) 포함
 */

import type { Metadata } from 'next'
import { AppShell } from '@/components/layout/app-shell'
import { getAppShellData } from '@/server/app-shell-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'StockInsight - 로컬 주식 분석 도구',
  description:
    '특정 종목의 5년 가격 흐름과 Google Trends 검색 관심도를 비교하여 투자 판단을 지원하는 로컬 분석 도구',
}

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { shell, profile } = await getAppShellData()
  return (
    <AppShell data={shell} profile={profile}>
      {children}
    </AppShell>
  )
}
