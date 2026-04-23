'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  GripVertical,
  X,
  Pencil,
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { KeywordRecord } from '@/types/database'

interface KeywordCardProps {
  keyword: KeywordRecord
  isManageMode: boolean
  mode?: 'normal' | 'delete' | 'reorder'
  isSelected: boolean
  isEditing: boolean
  onToggleSelect?: (id: string) => void
  onEditStart?: (id: string) => void
  onEditSave?: (id: string, newKeyword: string) => Promise<void>
  onEditCancel?: () => void
  onRefresh?: (id: string) => Promise<void>
  isRefreshing?: boolean
}

export function KeywordCard({
  keyword,
  isManageMode,
  mode = isManageMode ? 'delete' : 'normal',
  isSelected,
  isEditing,
  onToggleSelect,
  onEditStart,
  onEditSave,
  onEditCancel,
  onRefresh,
  isRefreshing = false,
}: KeywordCardProps) {
  const [editValue, setEditValue] = useState(keyword.keyword)
  const [isSaving, setIsSaving] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)

  // isEditing이 true로 바뀔 때 editValue 초기화
  useEffect(() => {
    if (isEditing) {
      setEditValue(keyword.keyword)
    }
  }, [isEditing, keyword.keyword])

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

  const handleRefresh = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await onRefresh?.(keyword.id)
  }

  const searchDate = new Date(keyword.searched_at)
  const formattedDate = searchDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  // 최신 트렌드 데이터 추출

  const isDeleteMode = mode === 'delete'
  const isReorderMode = mode === 'reorder'

  // 일반 모드 (비관리 모드)
  if (mode === 'normal') {
    return (
      <Link href={`/keywords/${keyword.id}`}>
        <div
          className={cn(
            'group border-border/50 from-card to-card/80 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 transition-all duration-200',
            'hover:border-primary/70 hover:shadow-primary/10 hover:shadow-md',
            'cursor-pointer backdrop-blur-sm',
            isRefreshing &&
              'border-cyan-400 bg-cyan-50/50 shadow-md ring-2 ring-cyan-400/30 dark:bg-cyan-950/20'
          )}
          onMouseEnter={() => setShowOverlay(true)}
          onMouseLeave={() => setShowOverlay(false)}
          onClick={() => setShowOverlay(prev => !prev)}
        >
          {isRefreshing && (
            <div className="absolute top-3 right-3 z-20 inline-flex items-center gap-1 rounded-full border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700 shadow-sm dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">
              <RefreshCw className="h-3 w-3 animate-spin" />
              최신화 중
            </div>
          )}

          <div className="space-y-3">
            {/* 키워드 이름 */}
            <h3 className="text-foreground truncate leading-tight font-semibold">
              {keyword.keyword}
            </h3>

            {/* 기준 날짜 */}
            <p className="text-muted-foreground text-xs">{formattedDate}</p>
          </div>

          {(showOverlay || isRefreshing) && (
            <div className="bg-background/70 absolute inset-0 flex items-center justify-center backdrop-blur-sm transition-opacity">
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="bg-background/95 h-12 w-12 rounded-full border-cyan-300 text-cyan-700 shadow-md transition-all hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-800 hover:shadow-lg dark:border-cyan-800 dark:text-cyan-200 dark:hover:bg-cyan-950"
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label="키워드 최신화"
              >
                <RefreshCw
                  className={cn('h-5 w-5', isRefreshing && 'animate-spin')}
                />
              </Button>
            </div>
          )}
        </div>
      </Link>
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

  // 편집 모드 (삭제/순서 변경)
  return (
    <div
      className={cn(
        'group relative rounded-xl border-2 p-4 transition-all duration-200',
        isDeleteMode && isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border/50 from-card to-card/80 bg-gradient-to-br',
        isDeleteMode && 'cursor-pointer',
        isReorderMode && 'cursor-grab active:cursor-grabbing'
      )}
      onClick={isDeleteMode ? () => onToggleSelect?.(keyword.id) : undefined}
    >
      {/* 좌상단: 체크박스 + 미조회 배지 */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        {isDeleteMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.(keyword.id)}
            onClick={e => e.stopPropagation()}
            aria-label={`${keyword.keyword} 선택`}
          />
        )}
        {isReorderMode && (
          <GripVertical className="text-muted-foreground h-4 w-4" />
        )}
      </div>

      <div className="space-y-3 pl-8">
        {/* 키워드 이름 */}
        <h3 className="text-foreground truncate leading-tight font-semibold">
          {keyword.keyword}
        </h3>

        {/* 기준 날짜 */}
        <p className="text-muted-foreground text-xs">{formattedDate}</p>
      </div>

      {isDeleteMode && (
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
        </div>
      )}
    </div>
  )
}
