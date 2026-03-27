import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { initializeApp } from '@/lib/env'

// 앱 시작 시 초기화
initializeApp().catch(error => {
  console.warn('앱 초기화 경고:', error)
})

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'StockInsight - 로컬 주식 분석 도구',
  description:
    '특정 종목의 5년 가격 흐름과 Google Trends 검색 관심도를 비교하여 투자 판단을 지원하는 로컬 분석 도구',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="calm"
          enableSystem
          disableTransitionOnChange
          themes={['light', 'dark', 'calm']}
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
