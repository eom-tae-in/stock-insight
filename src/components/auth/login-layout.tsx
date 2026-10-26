import type { ReactNode } from 'react'
import { Brand } from '@/components/layout/brand'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { LoginGuideLinks } from '@/components/guides/login-guide-links'

export function LoginLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="bg-card flex min-h-dvh flex-col break-keep">
      <header className="flex items-center justify-between px-6 py-5 sm:px-8">
        <Brand href="/login" />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 justify-center px-5 pt-6 pb-12 sm:pt-12">
        <div className="w-full max-w-[440px] space-y-5">
          <div className="shadow-card rounded-xl border p-6 sm:p-8">
            {children}
          </div>
          <LoginGuideLinks />
        </div>
      </main>
    </div>
  )
}
