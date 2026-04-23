/**
 * 로그인 페이지
 * Server Component - 미들웨어가 인증된 사용자를 /로 리디렉션하므로
 * 이 페이지는 미인증 사용자만 접근 가능
 *
 * 2가지 인증 방식:
 * 1. Google OAuth
 * 2. Email + Password
 */

import { Container } from '@/components/layout/container'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { OAuthLoginButton } from '@/components/auth/login-button'
import { LoginForm } from '@/components/auth/login-form'
import { Separator } from '@/components/ui/separator'

function getSafeNextPath(input?: string): string {
  if (!input || !input.startsWith('/')) return '/'
  if (input.startsWith('//')) return '/'
  return input
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string }
}) {
  const nextPath = getSafeNextPath(searchParams?.next)

  return (
    <div className="from-background via-background to-primary/5 flex min-h-screen flex-col bg-gradient-to-br">
      {/* 헤더 (테마 토글만) */}
      <header className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <h1 className="text-2xl font-bold">StockInsight</h1>
        <ThemeToggle />
      </header>

      {/* 메인 콘텐츠 - 가운데 정렬 */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Container className="w-full max-w-md">
          <div className="bg-card rounded-lg border p-8 shadow-lg">
            <div className="space-y-6">
              {/* 제목 */}
              <div className="space-y-2 text-center">
                <h2 className="text-3xl font-bold">환영합니다</h2>
                <p className="text-muted-foreground">
                  로컬 주식 분석 도구에 로그인하세요
                </p>
              </div>

              {/* OAuth 로그인 */}
              <div className="space-y-3">
                <div className="text-muted-foreground text-center text-sm font-medium">
                  SNS로 빠르게 로그인
                </div>
                <OAuthLoginButton
                  provider="google"
                  className="w-full"
                  nextPath={nextPath}
                />
              </div>

              {/* 구분선 */}
              <div className="relative">
                <Separator />
                <div className="bg-card absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2">
                  <span className="text-muted-foreground text-xs">또는</span>
                </div>
              </div>

              {/* Email + Password 로그인 */}
              <div className="space-y-3">
                <LoginForm nextPath={nextPath} />
              </div>

              {/* 이용 약관 */}
              <p className="text-muted-foreground text-center text-xs">
                로그인하면 우리의 서비스 약관에 동의하는 것입니다.
              </p>
            </div>
          </div>

          {/* 기능 설명 */}
          <div className="text-muted-foreground mt-8 grid grid-cols-1 gap-4 text-center text-sm">
            <div>
              <div className="mb-1 text-xl">📊</div>
              <p>5년 가격 흐름 분석</p>
            </div>
          </div>
        </Container>
      </main>
    </div>
  )
}
