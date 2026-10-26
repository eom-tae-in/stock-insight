import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { guideHref, guideStep, journeys } from '@/lib/guides/navigation'
import type { Journey } from '@/lib/guides/navigation'
import { GuideIllustration } from './guide-illustration'

export function GuideReader({
  journey,
  step,
}: {
  readonly journey: Journey
  readonly step: unknown
}) {
  const collection = journeys[journey]
  const current = guideStep(step, collection.cards.length)
  const card =
    collection.cards.find((_, index) => index + 1 === current) ??
    collection.cards[0]
  return (
    <main className="mx-auto flex w-full max-w-[1296px] flex-col gap-6 px-6 py-6 sm:px-12 sm:py-12">
      <nav aria-label="안내 종류" className="flex flex-wrap gap-2">
        {Object.entries(journeys).map(([key, value]) => (
          <Button
            key={key}
            asChild
            variant={journey === key ? 'secondary' : 'ghost'}
            size="mobile"
            className="flex-1 sm:min-w-42 sm:flex-none"
          >
            <Link
              href={value.path}
              aria-current={journey === key ? 'page' : undefined}
            >
              {value.title}
            </Link>
          </Button>
        ))}
      </nav>
      <div className="space-y-2">
        <p className="text-brand-text text-xs leading-4">
          {journey === 'current'
            ? '현재 서비스 사용법'
            : '목표 경험 · 리뉴얼 계획'}{' '}
          · {current} / {collection.cards.length}
        </p>
        <h1
          id="guide-title"
          tabIndex={-1}
          className="scroll-mt-6 text-2xl leading-8 font-bold tracking-tight outline-none sm:text-[32px] sm:leading-[42px]"
        >
          {card.title}
        </h1>
        <p className="text-text-secondary text-sm leading-[22px]">
          {card.desc}
        </p>
      </div>
      <article
        aria-label={card.label}
        className="bg-card rounded-xl border p-5 sm:p-8"
      >
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,372px)_minmax(0,1fr)]">
          <section className="min-w-0 space-y-4" aria-labelledby="steps-title">
            <h2 id="steps-title" className="text-xl leading-7 font-semibold">
              {journey === 'current'
                ? '이렇게 사용해 보세요'
                : '이렇게 바꾸려 해요'}
            </h2>
            <ol className="space-y-4">
              {card.steps.map((instruction, index) => (
                <li
                  key={instruction}
                  className="flex gap-2 text-sm leading-[22px]"
                >
                  <span
                    aria-hidden
                    className="text-brand-text w-7 shrink-0 font-semibold tabular-nums"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
            <aside className="bg-surface-raised space-y-2 rounded-md p-4">
              <h3 className="text-sm font-semibold">알아두세요</h3>
              <p className="text-text-secondary text-[13px] leading-5">
                {card.tip}
              </p>
            </aside>
          </section>
          <GuideIllustration visual={card.visual} />
        </div>
        <nav
          aria-label="카드 이동"
          className="mt-6 flex items-center justify-between gap-2"
        >
          {current > 1 ? (
            <Button
              asChild
              variant="secondary"
              size="mobile"
              className="min-w-20 sm:min-w-26"
            >
              <Link href={guideHref(journey, current - 1)}>이전</Link>
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="mobile"
              disabled
              className="min-w-20 sm:min-w-26"
            >
              이전
            </Button>
          )}
          <span
            className="text-text-secondary text-sm tabular-nums"
            aria-label={`${collection.cards.length}장 중 ${current}장`}
          >
            {current} / {collection.cards.length}
          </span>
          <Button asChild size="mobile" className="min-w-20 sm:min-w-26">
            <Link
              href={
                current < collection.cards.length
                  ? guideHref(journey, current + 1)
                  : '/explore'
              }
            >
              {current < collection.cards.length ? '다음' : '목차'}
            </Link>
          </Button>
        </nav>
      </article>
      <p className="text-text-tertiary text-xs leading-4">
        {journey === 'current'
          ? '현재 서비스에서 확인한 흐름을 설명해요. 예시 데이터이며 실제 계정 정보는 포함하지 않아요.'
          : '목표 디자인과 부분 구현을 소개해요. 실제 전체 연동과 데이터 이전은 아직 검증하지 않았어요.'}
      </p>
    </main>
  )
}
