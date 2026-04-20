'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Container } from './container'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { UserMenu } from '@/components/auth/user-menu'
import { cn } from '@/lib/utils'

export function Header() {
  const pathname = usePathname()

  const isActiveLink = (href: string) => {
    if (href === '/trends') {
      return pathname.startsWith('/trends')
    }
    return pathname === href
  }

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* 로고 + 네비게이션 */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold">
              StockInsight
            </Link>

            {/* 네비게이션 링크 */}
            <nav className="hidden space-x-1 sm:flex">
              <Link
                href="/"
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActiveLink('/')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                종목 분석
              </Link>
              <Link
                href="/trends"
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActiveLink('/trends')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                키워드 분석
              </Link>
            </nav>
          </div>

          {/* 우측: 사용자 메뉴 + 테마 토글 */}
          <div className="flex items-center space-x-4">
            <UserMenu />
            <ThemeToggle />
          </div>
        </div>
      </Container>
    </header>
  )
}
