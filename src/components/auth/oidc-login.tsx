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
        <div className="space-y-2">
          <h1 id="login-title" className="text-2xl leading-8 font-bold">
            분석을 이어가세요
          </h1>
          <p className="text-text-secondary text-sm leading-[22px]">
            계정으로 로그인하고 검색 관심도의 주간 흐름을 확인하세요.
          </p>
        </div>
        {failed && (
          <p role="alert" className="text-destructive text-sm">
            로그인을 완료하지 못했어요. 다시 시도해주세요.
          </p>
        )}
        <Button asChild size="lg" className="h-11 w-full">
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
