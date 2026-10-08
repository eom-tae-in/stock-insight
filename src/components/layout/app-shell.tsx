'use client'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Hash,
  LayoutDashboard,
  ChartCandlestick,
  Search,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  shellRoute,
  type ShellData,
  type AccountProfile,
} from '@/lib/app-shell'
import { useStockOrder } from '@/hooks/use-stock-order'
import { ChangeText } from '@/components/shared/change-badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { Kbd } from '@/components/shared/kbd'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/auth/user-menu'
import { ShellContext } from './shell-context'
import { Brand } from './brand'

const navigation = [
  { href: '/', label: '홈', icon: LayoutDashboard },
  { href: '/stock-analysis', label: '종목 분석', icon: ChartCandlestick },
  { href: '/keyword-analysis', label: '키워드 분석', icon: Hash },
] as const
const focus =
  'focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

export function AppShell({
  data,
  profile,
  children,
  pathnameOverride,
}: {
  readonly data: ShellData
  readonly profile: AccountProfile
  readonly children: ReactNode
  readonly pathnameOverride?: string
}) {
  const pathname = usePathname()
  const path = pathnameOverride ?? pathname
  const route = shellRoute(path, data)
  const { ordered } = useStockOrder(data.stocks)
  const active = (href: string) =>
    href === '/'
      ? path === '/'
      : path.startsWith(href) ||
        (href === '/keyword-analysis' && path.startsWith('/keywords/'))
  const items = data.isAdmin
    ? [
        ...navigation,
        { href: '/admin', label: '운영 대시보드', icon: ShieldCheck },
      ]
    : navigation
  return (
    <ShellContext value={data}>
      <div className="min-h-dvh">
        <a
          href="#app-content"
          className="bg-card focus-visible:ring-ring sr-only fixed top-2 left-2 z-50 rounded-md p-3 focus:not-sr-only focus:ring-2"
        >
          본문으로 이동
        </a>
        <aside
          aria-label="사이드바"
          className="bg-card border-border-subtle fixed inset-y-0 left-0 hidden w-60 flex-col gap-6 overflow-y-auto border-r px-4 py-5 lg:flex"
        >
          <div className="px-2">
            <Brand />
          </div>
          <nav aria-label="주 내비게이션" className="space-y-0.5">
            {items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? 'page' : undefined}
                className={cn(
                  'hover:bg-surface-raised flex h-[38px] items-center gap-2.5 rounded-md px-3 text-sm',
                  focus,
                  active(href)
                    ? 'bg-brand-subtle text-brand-text font-semibold'
                    : 'text-text-secondary'
                )}
              >
                <Icon aria-hidden className="size-5" />
                <span className="flex-1">{label}</span>
                {href === '/stock-analysis' || href === '/keyword-analysis' ? (
                  <span className="text-tertiary text-xs tabular-nums">
                    {href === '/stock-analysis'
                      ? data.stocks.length
                      : data.keywords.length}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
          <section aria-label="관심 종목" className="space-y-0.5">
            <div className="flex items-center justify-between px-3">
              <h2 className="text-tertiary text-xs font-semibold">관심 종목</h2>
              <Link
                href="/search"
                aria-label="관심 종목 추가"
                className={cn(
                  'text-text-secondary hover:bg-surface-raised flex size-9 items-center justify-center rounded-md',
                  focus
                )}
              >
                <Plus aria-hidden className="size-4" />
              </Link>
            </div>
            {ordered.slice(0, 5).map(stock => (
              <Link
                key={stock.id}
                href={`/stock-analysis/${stock.id}`}
                className={cn(
                  'hover:bg-surface-raised rounded-control relative flex h-8 items-center gap-2 px-3 text-[13px]',
                  focus
                )}
              >
                <span className="text-text-secondary flex-1 pl-3">
                  {stock.ticker}
                </span>
                <ChangeText
                  value={stock.change}
                  className="before:absolute before:top-1/2 before:left-3 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-current"
                  aria-label={`${stock.ticker} 주간 등락`}
                />
              </Link>
            ))}
            {ordered.length === 0 && (
              <p className="text-tertiary px-3 py-2 text-xs">
                저장한 종목이 없어요.
              </p>
            )}
            <Link
              href="/stock-analysis"
              className={cn(
                'text-text-secondary flex min-h-8 items-center gap-1 rounded-md px-3 text-xs',
                focus
              )}
            >
              관심 종목 {data.stocks.length}개 모두 보기
              <ChevronRight aria-hidden className="size-3" />
            </Link>
          </section>
          <div className="mt-auto space-y-4">
            <section
              aria-label="데이터 기준"
              className="bg-surface-raised rounded-panel space-y-2 p-3 text-xs"
            >
              <h2 className="text-tertiary flex items-center gap-1.5">
                <CalendarDays aria-hidden className="size-4" />
                데이터 기준
              </h2>
              <p className="text-sm font-semibold">{data.week}</p>
              <p className="text-tertiary">{data.weekRange} · 완료 주 기준</p>
              <p className="text-tertiary">다음 주차 반영: {data.nextWeek}</p>
              {data.staleCount > 0 && (
                <StatusBadge tone="warning" dot>
                  2주 이상 미갱신 {data.staleCount}건
                </StatusBadge>
              )}
            </section>
            <UserMenu initialProfile={profile} mode="profile" />
          </div>
        </aside>
        <div className="lg:pl-60">
          <header className="bg-background border-border-subtle sticky top-0 z-30 flex h-[52px] items-center gap-3 border-b px-4 lg:h-16 lg:px-8">
            <div className="hidden min-w-0 flex-1 items-center gap-1.5 text-[13px] lg:flex">
              <Link
                href={route.href}
                className={cn('text-tertiary rounded-sm', focus)}
              >
                {route.parent}
              </Link>
              <ChevronRight aria-hidden className="text-tertiary size-3.5" />
              <span className="truncate text-sm font-semibold">
                {route.title}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 items-center lg:hidden">
              {route.detail ? (
                <>
                  <Link
                    href={route.href}
                    aria-label="뒤로가기"
                    className={cn(
                      'flex size-11 items-center justify-center rounded-md',
                      focus
                    )}
                  >
                    <ArrowLeft aria-hidden className="size-5" />
                  </Link>
                  <span className="pointer-events-none absolute left-1/2 max-w-[calc(100%-144px)] -translate-x-1/2 truncate text-center text-sm font-semibold">
                    {route.title}
                  </span>
                </>
              ) : (
                <Brand />
              )}
            </div>
            <Link
              href="/search"
              aria-label="종목, 티커, 키워드 검색"
              className={cn(
                'bg-surface-raised text-tertiary hover:border-border-strong hidden h-[38px] w-[360px] items-center gap-2 rounded-md border px-3 text-[13px] lg:flex',
                focus
              )}
            >
              <Search aria-hidden className="size-4" />
              <span className="flex-1">종목, 티커, 키워드 검색</span>
              <Kbd>⌘K</Kbd>
            </Link>
            <Link
              href="/search"
              aria-label="검색"
              className={cn(
                'text-text-secondary size-11 items-center justify-center rounded-md lg:hidden',
                route.detail ? 'hidden' : 'flex',
                focus
              )}
            >
              <Search aria-hidden className="size-5" />
            </Link>
            <ThemeToggle className="lg:size-9" />
            <Button
              asChild
              variant="secondary"
              className="hidden lg:inline-flex"
            >
              <Link href="/keyword-analysis/new">
                <Plus aria-hidden />새 분석
              </Link>
            </Button>
          </header>
          <main
            id="app-content"
            tabIndex={-1}
            className="min-w-0 px-4 pt-7 pb-[calc(110px+env(safe-area-inset-bottom))] lg:px-8 lg:pb-12"
          >
            {children}
          </main>
        </div>
        <nav
          aria-label="모바일 내비게이션"
          className="bg-card border-border-subtle fixed inset-x-0 bottom-0 z-30 grid h-[86px] grid-cols-5 items-start border-t px-2 pt-3 pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? 'page' : undefined}
              className={cn(
                'flex min-h-11 flex-col items-center gap-1 rounded-md px-2 text-xs',
                focus,
                active(href) ? 'text-brand-text' : 'text-text-secondary'
              )}
            >
              <Icon aria-hidden className="size-5" />
              {label === '종목 분석'
                ? '종목'
                : label === '키워드 분석'
                  ? '키워드'
                  : label}
            </Link>
          ))}
          <Link
            href="/search"
            className={cn(
              'text-text-secondary flex min-h-11 flex-col items-center gap-1 rounded-md px-2 text-xs',
              focus
            )}
          >
            <Search aria-hidden className="size-5" />
            검색
          </Link>
          <UserMenu initialProfile={profile} mode="mobile" />
        </nav>
      </div>
    </ShellContext>
  )
}
