'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, TouchEvent } from 'react'
import { Button } from '@/components/ui/button'
import { guideStep, journeys } from '@/lib/guides/navigation'
import type { Journey } from '@/lib/guides/navigation'
import { GuideIllustration } from './guide-illustration'
import { GuideControls } from './guide-controls'

export function GuideReader({
  journey,
  step,
}: {
  readonly journey: Journey
  readonly step: unknown
}) {
  const [active, setActive] = useState(journey)
  const [current, setCurrent] = useState(() =>
    guideStep(step, journeys[journey].cards.length)
  )
  const [contents, setContents] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const animation = useRef<Animation | null>(null)
  const direction = useRef(1)
  const touch = useRef<readonly [number, number] | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const collection = journeys[active]
  const card =
    collection.cards.find((_, index) => index + 1 === current) ??
    collection.cards[0]

  useEffect(() => {
    animation.current?.cancel()
    if (panel.current?.parentElement) panel.current.parentElement.scrollTop = 0
    if (
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      panel.current?.animate
    ) {
      animation.current = panel.current.animate(
        [
          { opacity: 0, transform: `translateX(${direction.current * 12}px)` },
          { opacity: 1, transform: 'translateX(0)' },
        ],
        { duration: 180, easing: 'ease-out' }
      )
    }
    return () => animation.current?.cancel()
  }, [active, current])

  function change(next: number) {
    if (next < 1 || next > collection.cards.length || next === current) return
    direction.current = next > current ? 1 : -1
    setCurrent(next)
    setContents(false)
    heading.current?.focus({ preventScroll: true })
  }
  function switchJourney(next: Journey) {
    setActive(next)
    setCurrent(1)
    setContents(false)
  }
  function keys(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      change(current + 1)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      change(current - 1)
    }
  }
  function touchEnd(event: TouchEvent<HTMLElement>) {
    const end = event.changedTouches[0]
    if (touch.current && end) {
      const [x, y] = touch.current
      const dx = end.clientX - x
      const dy = end.clientY - y
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
        change(current + (dx < 0 ? 1 : -1))
    }
    touch.current = null
  }
  return (
    <main
      onKeyDown={keys}
      className="mx-auto grid h-[calc(100dvh-76px)] max-h-[860px] w-full max-w-[1136px] grid-rows-[auto_minmax(0,1fr)_80px_40px] px-5 pt-6 sm:h-[calc(100dvh-92px)] sm:px-12 sm:pt-8"
    >
      <nav aria-label="안내 종류" className="mb-6 flex flex-wrap gap-2">
        {(['current', 'renewal'] as const).map(key => (
          <Button
            key={key}
            size="mobile"
            variant={active === key ? 'secondary' : 'ghost'}
            aria-pressed={active === key}
            onClick={() => switchJourney(key)}
            className="min-w-0 flex-1 whitespace-normal sm:flex-none"
          >
            {journeys[key].title}
          </Button>
        ))}
      </nav>
      <p className="sr-only" role="status">
        {current} / {collection.cards.length} · {card.title}
      </p>
      {contents ? (
        <section
          aria-label="안내 목차"
          className="min-h-0 space-y-5 overflow-y-auto overscroll-contain rounded-xl border p-5 sm:p-8"
        >
          <h1 className="text-2xl font-bold">궁금한 내용을 골라봐요</h1>
          <ol className="grid gap-2 sm:grid-cols-2">
            {collection.cards.map((item, index) => (
              <li key={item.label}>
                <Button
                  variant="ghost"
                  size="mobile"
                  className="h-auto min-h-11 w-full justify-start text-left whitespace-normal"
                  onClick={() => {
                    setContents(false)
                    change(index + 1)
                  }}
                >
                  <span className="text-text-tertiary mr-2 tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {item.label}
                </Button>
              </li>
            ))}
          </ol>
          <Button
            variant="secondary"
            size="mobile"
            onClick={() => setContents(false)}
          >
            이어서 살펴봐요
          </Button>
        </section>
      ) : (
        <article
          aria-label={card.label}
          onTouchStart={event => {
            const start = event.touches[0]
            if (start) touch.current = [start.clientX, start.clientY]
          }}
          onTouchEnd={touchEnd}
          className="min-h-0 overflow-y-auto overscroll-contain rounded-xl border"
        >
          <div ref={panel} className="space-y-6 p-5 sm:p-8">
            <div className="space-y-2">
              <p className="text-brand-text text-xs">
                {active === 'current'
                  ? '지금 이렇게 사용해요'
                  : '이렇게 바꿔가요'}{' '}
                · {card.label}
              </p>
              <h1
                ref={heading}
                tabIndex={-1}
                className="text-2xl leading-8 font-bold tracking-tight outline-none sm:text-[32px] sm:leading-[42px]"
              >
                {card.title}
              </h1>
              <p className="text-text-secondary text-sm leading-[22px]">
                {card.desc}
              </p>
            </div>
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
              <section className="space-y-4" aria-labelledby="steps-title">
                <h2 id="steps-title" className="text-base font-semibold">
                  {active === 'current'
                    ? '하나씩 따라 해봐요'
                    : '이런 경험을 준비해요'}
                </h2>
                <ol className="space-y-4">
                  {card.steps.map((instruction, index) => (
                    <li
                      key={instruction}
                      className="flex gap-2 text-sm leading-[22px]"
                    >
                      <span
                        aria-hidden
                        className="text-brand-text w-6 shrink-0 tabular-nums"
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
                <aside className="bg-surface-sunken space-y-2 rounded-md p-4">
                  <h3 className="text-sm font-medium">함께 알아두면 좋아요</h3>
                  <p className="text-text-secondary text-[13px] leading-5">
                    {card.tip}
                  </p>
                </aside>
              </section>
              <GuideIllustration visual={card.visual} />
            </div>
          </div>
        </article>
      )}
      <GuideControls
        current={current}
        count={collection.cards.length}
        onChange={change}
        onContents={() => setContents(true)}
      />
      <p className="text-text-tertiary h-10 overflow-y-auto text-xs leading-5">
        {active === 'current'
          ? '실제 계정 정보가 없는 설명용 예시예요. 조회와 저장은 로그인 후 이용해요.'
          : '계획과 부분 구현을 소개해요. 실제 서비스 전체 연동과 데이터 이전은 검증을 이어가요.'}
      </p>
    </main>
  )
}
