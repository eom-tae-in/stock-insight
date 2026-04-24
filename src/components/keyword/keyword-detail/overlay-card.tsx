'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { KeywordStockOverlay, SearchRecord } from '@/types/database'

type OverlayDetail = KeywordStockOverlay & Partial<SearchRecord>

interface OverlayCardProps {
  overlay: OverlayDetail
  keywordId: string
}

export function OverlayCard({ overlay, keywordId }: OverlayCardProps) {
  return (
    <Link
      href={`/trends/search?keywordId=${keywordId}&overlayId=${overlay.id}`}
      className="block"
    >
      <div
        className={cn(
          'group border-border/50 from-card to-card/80 relative rounded-xl border bg-gradient-to-br p-6 transition-all duration-200',
          'hover:border-primary/70 hover:shadow-primary/10 hover:shadow-md',
          'cursor-pointer backdrop-blur-sm'
        )}
      >
        {/* 종목명 (주요 정보) */}
        <div className="space-y-3">
          <h3 className="text-foreground truncate text-2xl font-bold">
            {overlay.ticker}
          </h3>

          {/* 회사명 */}
          <p className="text-muted-foreground truncate text-sm">
            {overlay.company_name}
          </p>

          {/* 지표 영역 */}
          <div className="space-y-2 pt-2">
            {/* 현재가 */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">현재가</span>
              <span className="font-mono text-sm font-semibold">
                ${overlay.current_price?.toFixed(2) || '—'}
              </span>
            </div>

            {/* 13주 이동평균 기준 52주 YoY */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                13주 이동평균 기준 전년동기 대비 증감률(52주 YoY)
              </span>
              <span
                className={cn(
                  'font-mono text-sm font-semibold',
                  overlay.yoy_change == null
                    ? 'text-muted-foreground'
                    : overlay.yoy_change >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                )}
              >
                {overlay.yoy_change != null
                  ? `${overlay.yoy_change >= 0 ? '+' : ''}${overlay.yoy_change.toFixed(1)}%`
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* hover 시 표시되는 화살표 */}
        <div className="absolute right-2 bottom-2 opacity-0 transition-opacity group-hover:opacity-100">
          <svg
            className="text-primary h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  )
}
