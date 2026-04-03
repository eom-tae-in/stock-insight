/**
 * Auth Layout - 인증 페이지용 레이아웃
 * 최소한의 헤더만 포함 (테마 토글)
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '인증 | StockInsight',
  description: 'StockInsight 로그인 및 회원가입',
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}
