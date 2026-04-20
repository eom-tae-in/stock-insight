'use client'

import { Button } from '@/components/ui/button'
import { Check, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KeywordManageActionBarProps {
  totalCount: number
  selectedCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onDeleteSelected: () => void
  onDeleteAll: () => void
  onDone: () => void
}

export function KeywordManageActionBar({
  totalCount,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  onDeleteAll,
  onDone,
}: KeywordManageActionBarProps) {
  return (
    <div
      className={cn(
        'fixed right-0 bottom-0 left-0 sm:relative sm:mt-6',
        'bg-background/95 border-border/50 border-t backdrop-blur-md sm:rounded-xl sm:border',
        'px-4 py-3 sm:px-6 sm:py-4',
        'z-40'
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* 좌측: 선택 상태 및 일괄 선택 */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {selectedCount > 0 ? (
              <>
                <span className="text-primary">{selectedCount}</span>
                <span className="text-muted-foreground">개 선택됨</span>
              </>
            ) : (
              <span className="text-muted-foreground">선택 없음</span>
            )}
          </span>

          {selectedCount === 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              disabled={totalCount === 0}
              className="h-8 px-2 text-xs"
            >
              전체 선택
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              className="h-8 px-2 text-xs"
            >
              선택 해제
            </Button>
          )}
        </div>

        {/* 우측: 액션 버튼 */}
        <div className="flex gap-2 sm:gap-3">
          {/* 선택 삭제 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteSelected}
            disabled={selectedCount === 0}
            className={cn(
              'h-9 px-3 text-xs sm:text-sm',
              selectedCount > 0 &&
                'border-destructive/50 hover:bg-destructive/10 hover:text-destructive'
            )}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">선택 삭제</span>
            <span className="sm:hidden">{selectedCount}개 삭제</span>
          </Button>

          {/* 전체 삭제 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteAll}
            disabled={totalCount === 0}
            className="border-destructive/50 hover:bg-destructive/10 hover:text-destructive h-9 px-3 text-xs sm:text-sm"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">전체 삭제</span>
            <span className="sm:hidden">전부 삭제</span>
          </Button>

          {/* 완료 버튼 */}
          <Button
            variant="default"
            size="sm"
            onClick={onDone}
            className="h-9 px-3 text-xs sm:text-sm"
          >
            <Check className="mr-1 h-4 w-4" />
            완료
          </Button>
        </div>
      </div>
    </div>
  )
}
