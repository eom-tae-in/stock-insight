import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/theme-toggle'

export function OidcLogin({
  nextPath,
  failed,
}: {
  readonly nextPath: string
  readonly failed: boolean
}) {
  return (
    <div className="bg-background flex min-h-dvh flex-col break-keep">
      <header className="flex items-center justify-between p-6">
        <span className="text-xl font-bold">StockInsight</span>
        <ThemeToggle className="size-11" />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <section className="bg-card w-full max-w-md space-y-6 rounded-lg border p-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">분석을 이어가세요</h1>
            <p className="text-muted-foreground text-sm">
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
      </main>
    </div>
  )
}
