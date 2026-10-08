import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isOidcMode, OidcError } from '@/server/oidc/config'
import { requestSession } from '@/server/oidc/http'
import { TrendsJobsClient } from '@/components/trends-jobs/trends-jobs-client'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { ThemeMenu } from '@/components/shared/theme-menu'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: '검색 관심도 분석 | StockInsight',
  description: '주간 검색 관심도 분석을 요청하고 결과를 확인하세요.',
}

export default async function TrendsJobsPage() {
  if (!isOidcMode()) redirect('/login')
  const session = await requestSession().catch((error: unknown) => {
    if (error instanceof OidcError && error.status === 401) redirect('/login')
    throw error
  })
  return (
    <div className="bg-background min-h-dvh">
      <header className="border-b">
        <Container size="md">
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <Link href="/trends-jobs" className="text-xl font-bold">
              StockInsight
            </Link>
            <div className="flex items-center gap-3">
              <ThemeMenu displayName={session.displayName} />
              <ThemeToggle className="size-11" />
              <form method="post" action="/api/auth/oidc/logout">
                <input type="hidden" name="csrf" value={session.csrf} />
                <Button variant="outline" type="submit" className="h-11">
                  로그아웃
                </Button>
              </form>
            </div>
          </div>
        </Container>
      </header>
      <main>
        <Container size="md" className="py-8">
          <TrendsJobsClient csrf={session.csrf} />
        </Container>
      </main>
    </div>
  )
}
