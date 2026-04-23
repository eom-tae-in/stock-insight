'use client'

import { Button } from '@/components/ui/button'
import { Check, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KeywordManageActionBarProps {
  selectedCount: number
  mode: 'delete' | 'reorder'
  onDelete: () => void
  onDone: () => void
}

export function KeywordManageActionBar({
  selectedCount,
  mode,
  onDelete,
  onDone,
}: KeywordManageActionBarProps) {
  return (
    <div
      className={cn(
        'fixed right-0 bottom-0 left-0 sm:relative sm:mt-6',
        'bg-background/95 border-border/50 border-t backdrop-blur-md sm:rounded-xl sm:border',
        'z-40 px-4 py-3 sm:px-6 sm:py-4'
      )}
    >
      <div className="flex items-center justify-end gap-3">
        {mode === 'delete' && (
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
        )}

        {mode === 'delete' && selectedCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="h-9 border-red-200 bg-red-50 px-3 text-xs text-red-700 hover:bg-red-100 hover:text-red-800 sm:text-sm dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            삭제
          </Button>
        ) : mode === 'reorder' ? (
          <Button
            variant="default"
            size="sm"
            onClick={onDone}
            className="h-9 bg-slate-800 px-3 text-xs text-white hover:bg-slate-900 sm:text-sm dark:bg-slate-200 dark:text-slate-950 dark:hover:bg-white"
          >
            <Check className="mr-1 h-4 w-4" />
            완료
          </Button>
        ) : null}
      </div>
    </div>
  )
}
