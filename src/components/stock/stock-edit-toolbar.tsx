'use client'

import { useHydrated } from '@/hooks/use-hydrated'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type StockEditMode = 'none' | 'delete' | 'reorder'

export function StockEditToolbar({
  mode,
  count,
  selectedCount,
  busy,
  onModeChange,
  onSelectAll,
  onClear,
  onCancel,
  onDone,
  onDelete,
}: {
  readonly mode: StockEditMode
  readonly count: number
  readonly selectedCount: number
  readonly busy: boolean
  readonly onModeChange: (mode: 'delete' | 'reorder') => void
  readonly onSelectAll: () => void
  readonly onClear: () => void
  readonly onCancel: () => void
  readonly onDone: () => void
  readonly onDelete: () => void
}) {
  const hydrated = useHydrated()
  if (mode === 'none') {
    return (
      <div className="mb-4 flex justify-end">
        {hydrated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" disabled={busy}>
                <Pencil aria-hidden className="size-4" />
                편집
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onModeChange('delete')}>
                <Trash2 aria-hidden /> 삭제
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onModeChange('reorder')}>
                <GripVertical aria-hidden /> 순서 변경
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="secondary" disabled>
            <Pencil aria-hidden className="size-4" />
            편집
          </Button>
        )}
      </div>
    )
  }
  return (
    <div
      role="group"
      aria-label={mode === 'delete' ? '종목 삭제 편집' : '종목 순서 변경'}
      className="bg-surface-raised mb-4 flex flex-wrap items-center gap-3 rounded-md border px-4 py-3"
    >
      {mode === 'delete' ? (
        <>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <Checkbox
              aria-label="전체 선택"
              checked={
                selectedCount === count
                  ? true
                  : selectedCount > 0
                    ? 'indeterminate'
                    : false
              }
              onCheckedChange={checked =>
                checked === true ? onSelectAll() : onClear()
              }
              disabled={busy}
            />
            전체 선택
          </label>
          <span className="text-brand-text text-sm tabular-nums" role="status">
            {selectedCount}개 선택됨
          </span>
          <Button variant="ghost" onClick={onClear} disabled={busy}>
            선택 해제
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={onDone} disabled={busy}>
              완료
            </Button>
            <Button
              variant="danger"
              onClick={onDelete}
              disabled={busy || selectedCount === 0}
            >
              <Trash2 aria-hidden className="size-4" /> 삭제
            </Button>
          </div>
        </>
      ) : (
        <>
          <GripVertical aria-hidden className="text-text-secondary size-4" />
          <p className="text-text-secondary min-w-0 flex-1 text-sm leading-5">
            끌어서 순서를 바꿔요
            <span className="text-tertiary mt-1 block text-xs">
              바꾼 순서는 홈과 사이드바에도 그대로 보여요
            </span>
          </p>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={busy}>
              취소
            </Button>
            <Button onClick={onDone} disabled={busy}>
              완료
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
