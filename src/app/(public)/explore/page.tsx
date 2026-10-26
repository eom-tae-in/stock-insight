import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { journeys, guideHref } from '@/lib/guides/navigation'
export const metadata: Metadata = {
  title: '서비스 둘러보기 | StockInsight',
  description:
    '로그인 전에 현재 서비스 사용법과 리뉴얼 계획을 큰 카드로 살펴보세요.',
}
export default function ExplorePage() {
  return (
    <main className="mx-auto max-w-[1296px] space-y-8 px-6 py-8 sm:px-12 sm:py-12">
      <div className="space-y-3">
        <p className="text-brand-text text-xs">로그인 없이 둘러보기</p>
        <h1 className="text-2xl leading-8 font-bold sm:text-[32px] sm:leading-[42px]">
          StockInsight, 두 가지 이야기
        </h1>
        <p className="text-text-secondary text-sm leading-[22px]">
          현재 서비스는 사용 흐름으로, 리뉴얼은 목표 경험과 진행 상황으로
          살펴보세요.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {(['current', 'renewal'] as const).map(key => {
          const journey = journeys[key]
          return (
            <section
              key={key}
              className="bg-card space-y-6 rounded-xl border p-5 sm:p-8"
            >
              <div className="space-y-2">
                <p className="text-brand-text text-xs">
                  {key === 'current'
                    ? '현재 기능 · 7장'
                    : '목표와 진행 상황 · 6장'}
                </p>
                <h2 className="text-xl font-semibold">{journey.title}</h2>
                <p className="text-text-secondary text-sm leading-[22px]">
                  {key === 'current'
                    ? '저장·비교·다시 확인까지, 처음 사용하는 분을 위한 길잡이예요.'
                    : '어떤 사용자를 위해, 무엇을 왜 바꾸는지 정리했어요.'}
                </p>
              </div>
              <ol className="space-y-1">
                {journey.cards.map((card, index) => (
                  <li key={card.label}>
                    <Link
                      href={guideHref(key, index + 1)}
                      className="hover:bg-surface-raised focus-visible:ring-ring flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus-visible:ring-2"
                    >
                      <span className="text-text-tertiary tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {card.label}
                    </Link>
                  </li>
                ))}
              </ol>
              <Button
                asChild
                variant={key === 'current' ? 'primary' : 'secondary'}
                size="mobile"
                className="w-full"
              >
                <Link href={journey.path}>{journey.title} 시작하기</Link>
              </Button>
            </section>
          )
        })}
      </div>
      <p className="text-text-tertiary text-xs leading-5">
        안내의 예시 화면은 실제 계정 데이터가 아니에요. 조회와 저장은 로그인 후
        이용할 수 있어요.
      </p>
    </main>
  )
}
