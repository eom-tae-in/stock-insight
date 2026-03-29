'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
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
  const formattedDate = searchDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return (
    <Link
      href={`/trends/search?keyword=${encodeURIComponent(keyword.keyword)}`}
    >
      <div
        className={cn(
          'group bg-card relative rounded-lg border p-4',
          'hover:border-primary/50 transition-all hover:shadow-sm',
          'cursor-pointer'
        )}
      >
        {/* 삭제 버튼 - hover 시 표시 */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'absolute top-2 right-2 h-6 w-6 p-0',
            'text-destructive hover:bg-destructive/10',
            'opacity-0 transition-opacity group-hover:opacity-100'
          )}
          onClick={handleDelete}
          aria-label="키워드 삭제"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="space-y-3 pr-6">
          {/* 키워드 이름 */}
          <h3 className="truncate text-sm font-semibold">{keyword.keyword}</h3>

          {/* 지표 행 */}
          <div className="flex items-center gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">MA13 </span>
              <span className="font-mono font-medium">
                {keyword.ma13 != null ? keyword.ma13.toFixed(1) : '—'}
              </span>
            </div>
            <div className="text-muted-foreground/50">|</div>
            <div>
              <span className="text-muted-foreground">YoY </span>
              <span
                className={cn(
                  'font-mono font-medium',
                  keyword.yoy_change == null
                    ? 'text-muted-foreground'
                    : keyword.yoy_change >= 0
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
          <p className="text-muted-foreground text-xs">
            {formattedDate.replace(/\//g, '.')}
          </p>
        </div>
      </div>
    </Link>
  )
}
