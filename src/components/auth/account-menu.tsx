'use client'
import { useSyncExternalStore, type ReactNode } from 'react'
import { MoreHorizontal, UserRound } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ThemeSelector } from '@/components/shared/theme-selector'
import type { AccountProfile } from '@/lib/app-shell'
import { cn } from '@/lib/utils'

const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

export function AccountMenu({
  profile,
  logout,
  mode = 'profile',
  label = '계정 메뉴',
}: {
  readonly profile: AccountProfile
  readonly logout: ReactNode
  readonly mode?: 'profile' | 'avatar' | 'mobile' | 'oidc'
  readonly label?: string
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot
  )
  const avatar = (
    <Avatar className="size-8 shrink-0">
      <AvatarFallback className="bg-brand-subtle text-brand-text text-xs">
        {profile.name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
  const details = (
    <div className="min-w-0 flex-1 text-left">
      <p className="truncate text-sm font-semibold">{profile.name}</p>
      {profile.email && (
        <p className="text-tertiary truncate text-xs">{profile.email}</p>
      )}
    </div>
  )
  const content = (
    <>
      <div className="flex items-center gap-2.5 p-2.5">
        {avatar}
        {details}
      </div>
      <div className="border-border-subtle border-y p-2.5">
        <ThemeSelector autoFocus />
      </div>
      <div className="p-1">{logout}</div>
    </>
  )
  const trigger =
    mode === 'mobile' ? (
      <button
        aria-label="내 정보"
        disabled={!hydrated}
        className="text-text-secondary hover:bg-surface-raised focus-visible:ring-ring flex min-h-11 flex-col items-center justify-center gap-1 rounded-md px-2 text-xs outline-none focus-visible:ring-2"
      >
        <UserRound aria-hidden className="size-5" />내 정보
      </button>
    ) : (
      <button
        aria-label={label}
        disabled={!hydrated}
        className={cn(
          'hover:bg-surface-raised focus-visible:ring-ring flex min-h-11 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          mode === 'profile' ? 'w-full p-2' : 'px-2'
        )}
      >
        {avatar}
        {mode === 'profile' && (
          <>
            {details}
            <MoreHorizontal aria-hidden className="text-tertiary size-4" />
          </>
        )}
        {mode === 'oidc' && (
          <span className="max-w-24 truncate text-[13px] sm:max-w-40">
            {profile.name}
          </span>
        )}
      </button>
    )
  if (!hydrated) return trigger
  if (mode === 'mobile')
    return (
      <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="bg-card top-auto bottom-0 left-0 max-w-none translate-x-0 translate-y-0 rounded-b-none p-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:max-w-none [&>[data-slot=dialog-close]]:size-11">
          <DialogHeader>
            <DialogTitle>내 정보</DialogTitle>
            <DialogDescription className="sr-only">
              계정과 화면 모드를 확인하세요.
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        className="bg-surface-raised shadow-popover border-border-strong w-[300px] max-w-[calc(100vw-32px)] rounded-lg p-2"
      >
        {content}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
