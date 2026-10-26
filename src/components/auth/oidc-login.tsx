import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LoginLayout } from './login-layout'

export function OidcLogin({
  nextPath,
  failed,
}: {
  readonly nextPath: string
  readonly failed: boolean
}) {
  return (
    <LoginLayout>
      <section aria-labelledby="login-title" className="space-y-6">
        <div className="space-y-3 text-center">
          <h1
            id="login-title"
            className="text-[32px] leading-[42px] font-bold tracking-tight"
          >
            로그인
          </h1>
          <p className="text-text-secondary text-sm leading-[22px]">
            로그인하고 저장한 종목과 키워드를 이어서 살펴봐요.
          </p>
        </div>
        {failed && (
          <p role="alert" className="text-destructive text-sm">
            로그인을 완료하지 못했어요. 다시 시도해주세요.
          </p>
        )}
        <Button
          asChild
          size="lg"
          className="h-12 w-full text-base font-semibold"
        >
          <Link
            href={`/api/auth/oidc/login?next=${encodeURIComponent(nextPath)}`}
          >
            계정으로 로그인
          </Link>
        </Button>
        <p className="text-muted-foreground text-sm">
          회원가입과 비밀번호 재설정은 로그인 화면에서 진행할 수 있어요.
        </p>
      </section>
    </LoginLayout>
  )
}
