'use client'

import Link from 'next/link'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { KeywordSearchRecord } from '@/types/database'

interface KeywordCardProps {
  keyword: KeywordSearchRecord
  onDelete: (id: string) => void
}

export function KeywordCard({ keyword, onDelete }: KeywordCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete(keyword.id)
  }

  const searchDate = new Date(keyword.searched_at)
  const formattedDate = searchDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const isPositiveYoY = keyword.yoy_change != null && keyword.yoy_change >= 0

  return (
    <Link
      href={`/trends/search?keyword=${encodeURIComponent(keyword.keyword)}`}
    >
      <div
        className={cn(
          'group border-border/50 from-card to-card/80 relative rounded-xl border bg-gradient-to-br p-4 transition-all duration-200',
          'hover:border-primary/70 hover:shadow-primary/10 hover:shadow-md',
          'cursor-pointer backdrop-blur-sm'
        )}
      >
        {/* 삭제 버튼 */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'absolute top-2 right-2 h-7 w-7 p-0',
            'text-destructive transition-all duration-200',
            'opacity-0 group-hover:opacity-100',
            'hover:bg-destructive/15'
          )}
          onClick={handleDelete}
          aria-label="키워드 삭제"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="space-y-3 pr-6">
          {/* 키워드 이름 */}
          <h3 className="text-foreground truncate leading-tight font-semibold">
            {keyword.keyword}
          </h3>

          {/* 지표 영역 */}
          <div className="space-y-2">
            {/* MA13 */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">13주 MA</span>
              <span className="font-mono text-sm font-semibold">
                {keyword.ma13 != null ? keyword.ma13.toFixed(1) : '—'}
              </span>
            </div>

            {/* YoY */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">YoY</span>
                {isPositiveYoY ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : keyword.yoy_change != null ? (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                ) : null}
              </div>
              <span
                className={cn(
                  'font-mono text-sm font-semibold',
                  keyword.yoy_change == null
                    ? 'text-muted-foreground'
                    : isPositiveYoY
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                )}
              >
                {keyword.yoy_change != null
                  ? `${keyword.yoy_change >= 0 ? '+' : ''}${keyword.yoy_change.toFixed(1)}%`
                  : '—'}
              </span>
            </div>
          </div>

          {/* 저장 날짜 */}
          <p className="text-muted-foreground pt-1 text-xs">{formattedDate}</p>
        </div>
      </div>
    </Link>
  )
}
