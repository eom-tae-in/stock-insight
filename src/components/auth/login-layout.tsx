import type { ReactNode } from 'react'
import Image from 'next/image'
import { Brand } from '@/components/layout/brand'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { LoginGuideLinks } from '@/components/guides/login-guide-links'

export function LoginLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="bg-background min-h-dvh break-keep lg:grid lg:grid-cols-[1.12fr_1fr]">
      <section
        aria-label="서비스 소개"
        className="bg-card flex flex-col gap-8 px-6 py-6 sm:px-12 lg:min-h-dvh lg:py-12"
      >
        <div className="flex items-center justify-between">
          <Brand href="/explore" />
          <div className="lg:hidden">
            <ThemeToggle />
          </div>
        </div>
        <div className="hidden space-y-8 lg:block">
          <h2 className="text-[32px] leading-[42px] font-bold tracking-tight">
            검색 관심도와 주가,
            <br />
            같은 흐름에서 살펴보세요.
          </h2>
          <p className="text-text-secondary text-sm leading-[22px]">
            관심 대상을 저장하고, 지난번 분석을 다시 이어 보세요.
          </p>
          <figure className="bg-surface-sunken space-y-4 rounded-lg p-6">
            <figcaption className="text-text-tertiary text-xs">
              설명용 예시 · 실제 계정 정보 없음
            </figcaption>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['검색 관심도', '68 / 100'],
                ['종가 · 예시', '$210.00'],
              ].map(([title, value]) => (
                <div key={title} className="bg-surface-raised rounded-md p-4">
                  <p className="text-text-secondary text-xs">{title}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-brand-text text-xs">
              관심도 <span className="text-foreground ml-8">주가</span>
            </p>
            {(['light', 'dark'] as const).map(theme => (
              <Image
                key={theme}
                src={
                  theme === 'light'
                    ? '/guides/login-light.svg'
                    : '/guides/login.svg'
                }
                width={619.486}
                height={148.38}
                alt="관심도와 주가를 비교하는 설명용 그래프"
                className={
                  theme === 'light'
                    ? 'block h-auto max-w-full dark:hidden'
                    : 'hidden h-auto max-w-full dark:block'
                }
                unoptimized
              />
            ))}
            <p className="text-text-tertiary text-xs">
              설명용 시계열 · 실제 데이터가 아니에요
            </p>
            <p className="text-text-secondary text-xs">
              주간 데이터 · 서로 다른 단위와 축을 확인하세요
            </p>
          </figure>
        </div>
        <div className="hidden space-y-4 lg:block">
          <span className="bg-warning-subtle text-warning inline-flex rounded-md px-3 py-2 text-xs">
            리뉴얼 진행 중
          </span>
          <p className="text-text-secondary text-sm leading-[22px]">
            일부 화면과 기능이 단계적으로 달라질 수 있어요.
            <br />
            현재 사용법과 리뉴얼 방향을 구분해 안내합니다.
          </p>
        </div>
      </section>
      <main className="flex flex-col items-center px-6 py-6 lg:px-12 lg:py-12">
        <div className="hidden w-full justify-end lg:flex">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[380px] space-y-8 lg:mt-4">
          {children}
          <p className="text-text-secondary text-xs leading-5 lg:hidden">
            리뉴얼 진행 중 · 일부 화면이 단계적으로 달라질 수 있어요.
          </p>
          <LoginGuideLinks />
        </div>
      </main>
    </div>
  )
}
