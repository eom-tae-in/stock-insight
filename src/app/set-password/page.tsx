/**
 * 비밀번호 설정 페이지
 * Server Component - 이메일 OTP 인증 후 리다이렉트되는 페이지
 * 미들웨어가 보호하므로 인증된 사용자만 접근 가능
 */

import { Container } from '@/components/layout/container'
import { ThemeToggle } from '@/components/theme-toggle'
import { SetPasswordForm } from '@/components/auth/set-password-form'

export default function SetPasswordPage() {
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
                <h2 className="text-3xl font-bold">비밀번호 설정</h2>
                <p className="text-muted-foreground">
                  계정에서 사용할 비밀번호를 설정해주세요
                </p>
              </div>

              {/* 비밀번호 설정 폼 */}
              <SetPasswordForm />

              {/* 이용 약관 */}
              <p className="text-muted-foreground text-center text-xs">
                비밀번호 설정 완료 후 로그인할 수 있습니다.
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
