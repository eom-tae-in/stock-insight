import Link from 'next/link'
import { Brand } from '@/components/layout/brand'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'

export function PublicHeader() {
  return (
    <header className="bg-card flex flex-wrap items-center justify-between gap-2 px-4 py-4 sm:px-6 sm:py-6">
      <Brand href="/explore" />
      <nav aria-label="안내 메뉴" className="flex items-center gap-1 sm:gap-3">
        <ThemeToggle />
        <Button asChild variant="ghost" size="mobile">
          <Link href="/explore">목차</Link>
        </Button>
        <Button asChild variant="secondary" size="mobile">
          <Link href="/login">로그인</Link>
        </Button>
      </nav>
    </header>
  )
}
