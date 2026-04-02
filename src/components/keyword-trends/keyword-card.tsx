'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { X, Pencil, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { KeywordSearchRecord } from '@/types/database'

interface KeywordCardProps {
  keyword: KeywordSearchRecord
  isManageMode: boolean
  isSelected: boolean
  isEditing: boolean
  isDetailView?: boolean
  onDelete?: () => void
  onToggleSelect?: (id: string) => void
  onEditStart?: (id: string) => void
  onEditSave?: (id: string, newKeyword: string) => Promise<void>
  onEditCancel?: () => void
  onSelect?: (id: string) => void
}

export function KeywordCard({
  keyword,
  isManageMode,
  isSelected,
  isEditing,
  isDetailView,
  onDelete,
  onToggleSelect,
  onEditStart,
  onEditSave,
  onEditCancel,
  onSelect,
}: KeywordCardProps) {
  const [editValue, setEditValue] = useState(keyword.keyword)
  const [isSaving, setIsSaving] = useState(false)

  // isEditing이 true로 바뀔 때 editValue 초기화
  useEffect(() => {
    if (isEditing) {
      setEditValue(keyword.keyword)
    }
  }, [isEditing, keyword.keyword])

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.()
  }

  const handleEditStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onEditStart?.(keyword.id)
  }

  const handleEditCancel = () => {
    onEditCancel?.()
  }

  const handleEditSave = async () => {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === keyword.keyword) {
      handleEditCancel()
      return
    }

    setIsSaving(true)
    try {
      await onEditSave?.(keyword.id, trimmed)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleEditSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleEditCancel()
    }
  }

  const searchDate = new Date(keyword.searched_at)
  const formattedDate = searchDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const isPositiveYoY = keyword.yoy_change != null && keyword.yoy_change >= 0

  // 미조회 여부 판별 (last_viewed_at이 null이거나 searched_at보다 이전)
  const isUnviewed =
    !keyword.last_viewed_at ||
    new Date(keyword.last_viewed_at) < new Date(keyword.searched_at)

  // 일반 모드 (비관리 모드)
  if (!isManageMode) {
    const handleCardClick = () => {
      onSelect?.(keyword.id)
    }

    return (
      <div
        className={cn(
          'group border-border/50 from-card to-card/80 relative rounded-xl border bg-gradient-to-br p-4 transition-all duration-200',
          'hover:border-primary/70 hover:shadow-primary/10 hover:shadow-md',
          'cursor-pointer backdrop-blur-sm',
          isDetailView && 'border-primary shadow-primary/20 shadow-lg'
        )}
        onClick={handleCardClick}
      >
        {/* 오버레이 링크 (카드 전체 클릭 가능) - Detail View에서는 숨김 */}
        {!isDetailView && (
          <Link
            href={`/trends/search?keywordId=${keyword.id}`}
            className="absolute inset-0 rounded-xl"
          />
        )}

        {/* 콘텐츠 및 인터랙티브 요소 (링크보다 위) */}
        <div className="relative z-10">
          {/* 삭제 버튼 - hover 시 표시 */}
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
                <span className="text-muted-foreground text-xs">YoY</span>
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
            <p className="text-muted-foreground pt-1 text-xs">
              {formattedDate}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 수정 모드
  if (isEditing) {
    return (
      <div
        className={cn(
          'border-primary bg-primary/5 relative rounded-xl border-2 p-4 transition-all duration-200'
        )}
      >
        <div className="space-y-3">
          {/* Input 필드 */}
          <Input
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            placeholder="키워드 입력"
            className="font-semibold"
            disabled={isSaving}
          />

          {/* 저장/취소 버튼 */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleEditSave}
              disabled={isSaving || !editValue.trim()}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 저장 중...
                </>
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" /> 저장
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleEditCancel}
              disabled={isSaving}
              className="flex-1"
            >
              <X className="mr-1 h-4 w-4" /> 취소
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 관리 모드 (수정 아님)
  return (
    <div
      className={cn(
        'group relative rounded-xl border-2 p-4 transition-all duration-200',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border/50 from-card to-card/80 bg-gradient-to-br'
      )}
    >
      {/* 좌상단: 체크박스 + 미조회 배지 */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect?.(keyword.id)}
          aria-label={`${keyword.keyword} 선택`}
        />
        {isUnviewed && <div className="bg-primary h-2 w-2 rounded-full" />}
      </div>

      <div className="space-y-3 pl-8">
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
            <span className="text-muted-foreground text-xs">YoY</span>
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

      {/* 우상단: 수정/삭제 버튼 */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-7 w-7 p-0"
          onClick={handleEditStart}
          aria-label="키워드 수정"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/15 h-7 w-7 p-0"
          onClick={handleDelete}
          aria-label="키워드 삭제"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
