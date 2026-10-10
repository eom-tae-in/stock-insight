'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useMediaQuery } from 'usehooks-ts'
import { GitCompareArrows, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { ChangeText } from '@/components/shared/change-badge'
import { keywordInsight, linkedKeywords } from '@/lib/insights/keywords'
import { REGION_LABEL, SEARCH_TYPE_LABEL } from '@/lib/insights/labels'
import type { KeywordRecord, SearchRecord } from '@/types/database'

export function StockDetailRail({
  record,
  keywords,
  cacheTtlSeconds,
}: {
  readonly record: SearchRecord
  readonly keywords: readonly KeywordRecord[]
  readonly cacheTtlSeconds: number | null
}) {
  const [open, setOpen] = useState(false)
  const mobile = useMediaQuery('(max-width: 639px)', {
    initializeWithValue: false,
  })
  const connected = new Set(
    linkedKeywords(record.ticker, keywords).map(item => item.id)
  )
  const insights = keywords
    .filter(item => connected.has(item.id))
    .map(keywordInsight)
  const href = (id: string) =>
    `/keywords/${encodeURIComponent(id)}?preview=${encodeURIComponent(record.ticker)}`
  const trigger = (
    <Button className="w-full">
      <GitCompareArrows aria-hidden className="size-4" />
      키워드와 비교하기
    </Button>
  )
  const choices = (
    <nav aria-label="비교할 키워드" className="max-h-72 overflow-y-auto">
      {keywords.length ? (
        keywords.map(item => (
          <Link
            key={item.id}
            href={href(item.id)}
            className="hover:bg-muted focus-visible:bg-muted flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm outline-none"
            onClick={() => setOpen(false)}
          >
            <Hash aria-hidden className="text-brand-text size-4" />
            <span className="min-w-0 break-words">{item.keyword}</span>
          </Link>
        ))
      ) : (
        <p className="text-text-secondary p-3 text-sm">
          비교할 키워드가 없어요. 먼저 키워드를 저장해주세요.
        </p>
      )}
    </nav>
  )
  const rawDate = record.last_updated_at ?? record.searched_at
  const date = new Date(rawDate)
  const updatedAt = Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(date)
    : '—'
  return (
    <aside aria-label="종목 연결과 데이터 정보" className="min-w-0 space-y-4">
      <section
        aria-labelledby="stock-linked-keywords"
        className="bg-card overflow-hidden rounded-lg border"
      >
        <header className="px-5 py-4">
          <h2 id="stock-linked-keywords" className="text-base font-semibold">
            연결 키워드{' '}
            <span className="text-text-secondary ml-1 text-sm font-normal">
              {insights.length}
            </span>
          </h2>
          <p className="text-text-secondary mt-1 text-xs leading-4">
            이 종목을 겹쳐 본 키워드 · 대표 분석의 최근 주 관심도
          </p>
        </header>
        {insights.length ? (
          <ul>
            {insights.map(item => (
              <li key={item.id} className="border-t">
                <Link
                  href={href(item.id)}
                  className="hover:bg-muted focus-visible:bg-muted flex items-center gap-3 px-5 py-3 outline-none"
                >
                  <span className="bg-brand-subtle text-brand-text flex size-8 shrink-0 items-center justify-center rounded-md">
                    <Hash aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {item.keyword}
                    </span>
                    <span className="text-text-secondary block text-xs">
                      {REGION_LABEL[item.region]} ·{' '}
                      {SEARCH_TYPE_LABEL[item.searchType]}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="text-brand-text block text-sm tabular-nums">
                      {item.value ?? '—'}
                    </span>
                    <span className="text-tertiary text-xs">
                      YoY <ChangeText value={item.yoy} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-secondary border-t px-5 py-4 text-sm">
            아직 이 종목에 연결된 키워드가 없어요.
          </p>
        )}
        <div className="px-5 py-4">
          {mobile ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>{trigger}</DialogTrigger>
              <DialogContent>
                <DialogTitle>비교할 키워드 선택</DialogTitle>
                <DialogDescription>
                  {record.ticker}와 관심도 흐름을 비교해요.
                </DialogDescription>
                {choices}
              </DialogContent>
            </Dialog>
          ) : (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>{trigger}</PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <p className="px-3 py-2 text-sm font-semibold">
                  비교할 키워드 선택
                </p>
                {choices}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </section>
      <section
        aria-labelledby="stock-data-info"
        className="bg-card rounded-lg border px-5 py-4"
      >
        <h2 id="stock-data-info" className="text-base font-semibold">
          데이터 정보
        </h2>
        <dl className="mt-4 space-y-3 text-xs">
          {[
            ['출처', 'Yahoo Finance'],
            ['주기', '주간 · 완료된 주 기준'],
            ['조회 기간', '5년 · 약 260주'],
            ['저장된 주간 데이터', `${record.price_data.length}주`],
            ['통화', record.currency ?? '—'],
            ['최근 갱신 (한국 시간)', updatedAt],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <dt className="text-tertiary shrink-0">{label}</dt>
              <dd className="text-text-secondary text-right text-[13px]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {cacheTtlSeconds !== null && (
          <div className="mt-4">
            <StatusBadge dot>
              캐시 사용 · {cacheTtlSeconds / 3600}시간
            </StatusBadge>
          </div>
        )}
      </section>
    </aside>
  )
}
