import type { ReactNode } from 'react'
import { Brand } from './brand'
import { AccountMenu } from '@/components/auth/account-menu'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Container } from './container'

export function OidcShell({
  displayName,
  csrf,
  children,
}: {
  readonly displayName: string
  readonly csrf: string
  readonly children: ReactNode
}) {
  const logout = (
    <form method="post" action="/api/auth/oidc/logout">
      <input type="hidden" name="csrf" value={csrf} />
      <Button variant="secondary" type="submit" className="h-11">
        로그아웃
      </Button>
    </form>
  )
  return (
    <div className="bg-background min-h-dvh">
      <header className="border-border-subtle border-b">
        <Container size="md">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
            <Brand href="/trends-jobs" />
            <div className="flex items-center gap-2">
              <AccountMenu
                profile={{ name: displayName }}
                label="화면 모드 선택"
                mode="oidc"
                logout={logout}
              />
              <ThemeToggle />
              {logout}
            </div>
          </div>
        </Container>
      </header>
      <main>
        <Container size="md" className="py-8">
          {children}
        </Container>
      </main>
    </div>
  )
}
