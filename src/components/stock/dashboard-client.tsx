/**
 * Task 013: 대시보드 Client Component
 *
 * Server Component에서 초기 데이터를 받아
 * 내 종목 목록의 삭제/순서 변경을 처리합니다.
 */

'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StockCard } from '@/components/stock/stock-card'
import { cn } from '@/lib/utils'
import type { SearchRecord } from '@/types'

interface DashboardClientProps {
  initialRecords: SearchRecord[]
}

type EditMode = 'none' | 'delete' | 'reorder'

const SORT_ORDER_KEY = 'stock-sort-order'

function SortableStockCard({
  record,
  children,
}: {
  record: SearchRecord
  children: ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: record.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 10 : 'auto',
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

export function DashboardClient({ initialRecords }: DashboardClientProps) {
  const [records, setRecords] = useState(initialRecords)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [isEditMode, setIsEditMode] = useState(false)
  const [editMode, setEditMode] = useState<EditMode>('none')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [reorderBackup, setReorderBackup] = useState<SearchRecord[] | null>(
    null
  )
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 저장된 순서 복원 (초기 로딩 시에만)
  useEffect(() => {
    const savedOrder = localStorage.getItem(SORT_ORDER_KEY)
    if (savedOrder) {
      try {
        const orderMap = JSON.parse(savedOrder) as Record<string, number>
        const sorted = [...initialRecords].sort((a, b) => {
          const orderA = orderMap[a.id] ?? Infinity
          const orderB = orderMap[b.id] ?? Infinity
          return orderA - orderB
        })
        setRecords(sorted)
      } catch (error) {
        console.error('Failed to restore sort order:', error)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveOrder = (nextRecords: SearchRecord[]) => {
    const orderMap: Record<string, number> = {}
    nextRecords.forEach((record, index) => {
      orderMap[record.id] = index
    })
    localStorage.setItem(SORT_ORDER_KEY, JSON.stringify(orderMap))
  }

  const closeEditMode = () => {
    if (editMode === 'reorder' && reorderBackup) {
      setRecords(reorderBackup)
    }

    setIsEditMode(false)
    setEditMode('none')
    setSelectedIds(new Set())
    setReorderBackup(null)
  }

  const handleSelectDeleteMode = () => {
    setEditMode('delete')
    setSelectedIds(new Set())
    setReorderBackup(null)
  }

  const handleSelectReorderMode = () => {
    setEditMode('reorder')
    setSelectedIds(new Set())
    setReorderBackup(records)
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedIds(new Set(records.map(record => record.id)))
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('삭제할 종목을 선택하세요.')
      return
    }

    const idsToDelete = Array.from(selectedIds)
    setLoadingIds(new Set(idsToDelete))

    try {
      const results = await Promise.all(
        idsToDelete.map(id =>
          fetch(`/api/searches/${id}`, {
            method: 'DELETE',
          })
        )
      )

      if (!results.every(response => response.ok)) {
        throw new Error('Some deletions failed')
      }

      const nextRecords = records.filter(record => !selectedIds.has(record.id))
      setRecords(nextRecords)
      saveOrder(nextRecords)
      setSelectedIds(new Set())
      setIsEditMode(false)
      setEditMode('none')
      toast.success(`${idsToDelete.length}개 종목이 삭제되었습니다.`)
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('삭제에 실패했습니다.')
    } finally {
      setLoadingIds(new Set())
      setDeleteConfirmOpen(false)
    }
  }

  const handleConfirmReorder = () => {
    saveOrder(records)
    setIsEditMode(false)
    setEditMode('none')
    setReorderBackup(null)
    toast.success('종목 위치가 저장되었습니다.')
  }

  const handleEditDone = () => {
    if (editMode === 'reorder') {
      handleConfirmReorder()
      return
    }

    closeEditMode()
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (editMode !== 'reorder' || !over || active.id === over.id) return

    const oldIndex = records.findIndex(record => record.id === active.id)
    const newIndex = records.findIndex(record => record.id === over.id)

    if (oldIndex < 0 || newIndex < 0) return

    setRecords(prev => arrayMove(prev, oldIndex, newIndex))
  }

  const handleRefresh = async (id: string) => {
    try {
      setLoadingIds(prev => new Set(prev).add(id))

      const response = await fetch(`/api/searches/${id}/refreshes`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to refresh')
      }

      const body = (await response.json()) as { data?: SearchRecord }
      if (body.data) {
        setRecords(prev =>
          prev.map(record => (record.id === id ? body.data! : record))
        )
      }

      toast.success('종목을 최신화했습니다.')
    } catch (error) {
      console.error('Refresh failed:', error)
      toast.error('종목 최신화에 실패했습니다.')
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleDeleteOne = async (id: string) => {
    setSelectedIds(new Set([id]))
    setDeleteConfirmOpen(true)
  }

  const renderStockCard = (record: SearchRecord) => (
    <div
      className={cn(
        'group relative',
        editMode === 'delete' && 'cursor-pointer',
        editMode === 'delete' &&
          selectedIds.has(record.id) &&
          'ring-offset-background rounded-lg ring-2 ring-cyan-400 ring-offset-2'
      )}
      onClick={
        editMode === 'delete' ? () => handleToggleSelect(record.id) : undefined
      }
    >
      {editMode === 'delete' && (
        <div
          className="absolute top-4 left-4 z-20"
          onClick={event => event.stopPropagation()}
        >
          <Checkbox
            checked={selectedIds.has(record.id)}
            onCheckedChange={() => handleToggleSelect(record.id)}
            aria-label={`${record.ticker} 선택`}
          />
        </div>
      )}
      <StockCard
        id={record.id}
        ticker={record.ticker}
        companyName={record.company_name}
        currency={record.currency}
        weeklyOpen={record.weekly_open ?? 0}
        weeklyHigh={record.weekly_high ?? 0}
        weeklyLow={record.weekly_low ?? 0}
        currentPrice={record.current_price ?? 0}
        previousClose={record.previous_close ?? 0}
        ma13={record.ma13 ?? 0}
        yoyChange={record.yoy_change ?? 0}
        lastUpdatedAt={record.last_updated_at ?? record.searched_at}
        onRefresh={() => handleRefresh(record.id)}
        onDelete={() => handleDeleteOne(record.id)}
        isLoading={loadingIds.has(record.id)}
        editMode={editMode}
      />
    </div>
  )

  const isEmpty = records.length === 0

  return (
    <>
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground mb-6 text-lg">
            내 종목이 없습니다.
          </p>
          <Button asChild>
            <Link href="/search">+ 추가</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex justify-end gap-2">
            {!isEditMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Pencil className="mr-2 h-4 w-4" />
                편집
              </Button>
            ) : editMode === 'none' ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectDeleteMode}
                  className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectReorderMode}
                  className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                >
                  <GripVertical className="mr-2 h-4 w-4" />
                  순서 변경
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeEditMode}
                  className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <X className="mr-2 h-4 w-4" />
                  완료
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditDone}
                className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="mr-2 h-4 w-4" />
                완료
              </Button>
            )}
          </div>

          {editMode === 'delete' && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  전체 선택
                </Button>
                {selectedIds.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    선택 해제
                  </Button>
                )}
                <span className="text-muted-foreground text-sm">
                  {selectedIds.size}개 선택됨
                </span>
              </div>
              {selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={loadingIds.size > 0}
                  className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
              )}
            </div>
          )}

          {editMode === 'reorder' ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={records.map(record => record.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {records.map(record => (
                    <SortableStockCard key={record.id} record={record}>
                      {renderStockCard(record)}
                    </SortableStockCard>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {records.map(record => (
                <div key={record.id}>{renderStockCard(record)}</div>
              ))}
            </div>
          )}
        </>
      )}

      {!isEmpty && editMode !== 'delete' && editMode !== 'reorder' && (
        <div className="fixed right-6 bottom-6">
          <Button size="lg" className="rounded-full shadow-lg" asChild>
            <Link href="/search">+ 추가</Link>
          </Button>
        </div>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>종목 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택된 {selectedIds.size}개의 종목을 삭제하시겠습니까? 이 작업은
              되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingIds.size > 0}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault()
                void handleDeleteSelected()
              }}
              disabled={loadingIds.size > 0}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loadingIds.size > 0 ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
