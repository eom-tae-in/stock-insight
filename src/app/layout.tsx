import type { Metadata } from 'next'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ReactDevTools } from '@/components/providers/react-dev-tools'

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
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themes={['light', 'dark']}
        >
          {children}
          <Toaster />
          {process.env.NODE_ENV === 'development' && <ReactDevTools />}
        </ThemeProvider>
      </body>
    </html>
  )
}
