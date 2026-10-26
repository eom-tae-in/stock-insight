/**
 * 로그인 페이지
 * Server Component - 미들웨어가 인증된 사용자를 /로 리디렉션하므로
 * 이 페이지는 미인증 사용자만 접근 가능
 *
 * 2가지 인증 방식:
 * 1. Google OAuth
 * 2. Email + Password
 */

import { OAuthLoginButton } from '@/components/auth/login-button'
import { LoginForm } from '@/components/auth/login-form'
import { Separator } from '@/components/ui/separator'
import { LoginLayout } from '@/components/auth/login-layout'
import { isOidcMode, safeOidcNext } from '@/server/oidc/config'
import { OidcLogin } from '@/components/auth/oidc-login'

function getSafeNextPath(input?: string): string {
  if (!input || !input.startsWith('/')) return '/'
  if (input.startsWith('//')) return '/'
  return input
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; error?: string }>
}) {
  const params = await searchParams
  if (isOidcMode())
    return (
      <OidcLogin
        nextPath={safeOidcNext(params?.next ?? null)}
        failed={params?.error === 'auth_error'}
      />
    )
  const nextPath = getSafeNextPath(params?.next)

  return (
    <LoginLayout>
      <section aria-labelledby="login-title" className="space-y-6">
        <div className="space-y-2">
          <h1 id="login-title" className="text-2xl leading-8 font-bold">
            로그인해요
          </h1>
          <p className="text-text-secondary text-sm leading-[22px]">
            저장한 종목과 키워드를 이어서 확인해요.
          </p>
        </div>
        <OAuthLoginButton
          provider="google"
          className="w-full"
          nextPath={nextPath}
        />
        <div className="relative">
          <Separator />
          <span className="bg-background text-text-secondary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs">
            또는 이메일로 로그인
          </span>
        </div>
        <LoginForm nextPath={nextPath} />
        <p className="text-text-secondary text-center text-xs">
          로그인하고 저장한 분석을 이어서 살펴봐요.
        </p>
      </section>
    </LoginLayout>
  )
}
