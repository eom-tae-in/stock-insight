/**
 * Task 013: 대시보드 Client Component
 *
 * Server Component에서 초기 데이터를 받아
 * 내 종목 목록의 삭제/순서 변경을 처리합니다.
 */

'use client'

import Link from 'next/link'
import {
  useState,
  useRef,
  Fragment,
  type ReactNode,
  type ComponentProps,
} from 'react'
import { useStockOrder } from '@/hooks/use-stock-order'
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
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { StockEditToolbar, type StockEditMode } from './stock-edit-toolbar'
import { StockDeleteDialog } from './stock-delete-dialog'
import {
  StockListRow,
  StockListHeader,
} from '@/components/stock/stock-list-row'
import { GripVertical, Plus, Search } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import type { LinkedInterest } from '@/lib/stock/list-summary'
import type { SearchRecord } from '@/types'

interface DashboardClientProps {
  readonly initialRecords: SearchRecord[]
  readonly interests?: Readonly<Record<string, LinkedInterest>>
}

function SortableStockRow({
  record,
  children,
}: {
  record: SearchRecord
  children: (
    handle: ReactNode,
    rowProps: Pick<ComponentProps<'tr'>, 'ref' | 'style'>
  ) => ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: record.id })

  return children(
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label={`${record.ticker} 순서 변경`}
      className="text-text-secondary focus-visible:ring-ring relative z-10 flex size-11 shrink-0 cursor-grab items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <GripVertical aria-hidden className="size-4" />
    </button>,
    {
      ref: setNodeRef,
      style: {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 10 : 'auto',
      },
    }
  )
}

export function DashboardClient({
  initialRecords,
  interests = {},
}: DashboardClientProps) {
  const [records, setRecords] = useState(initialRecords)
  const { ordered, saveOrder } = useStockOrder(records)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [editMode, setEditMode] = useState<StockEditMode>('none')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const reorderBackup = useRef<SearchRecord[] | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      scrollBehavior: 'auto',
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const closeEditMode = () => {
    if (editMode === 'reorder' && reorderBackup.current) {
      setRecords(reorderBackup.current)
    }

    setEditMode('none')
    setSelectedIds(new Set())
    reorderBackup.current = null
  }

  const handleSelectDeleteMode = () => {
    setEditMode('delete')
    setSelectedIds(new Set())
    reorderBackup.current = null
  }

  const handleSelectReorderMode = () => {
    setRecords(ordered)
    setEditMode('reorder')
    setSelectedIds(new Set())
    reorderBackup.current = ordered
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

      const nextRecords = ordered.filter(record => !selectedIds.has(record.id))
      setRecords(nextRecords)
      saveOrder(nextRecords)
      setSelectedIds(new Set())
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
    setEditMode('none')
    reorderBackup.current = null
    toast.success('종목 위치가 저장되었습니다.')
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

  const renderStockRow = (
    record: SearchRecord,
    handle?: ReactNode,
    rowProps?: Pick<ComponentProps<'tr'>, 'ref' | 'style'>
  ) => (
    <StockListRow
      record={record}
      rowProps={rowProps}
      interest={interests[record.ticker.toUpperCase()]}
      managing={editMode !== 'none'}
      selected={selectedIds.has(record.id)}
      busy={loadingIds.has(record.id)}
      onRefresh={() => void handleRefresh(record.id)}
      onDelete={() => void handleDeleteOne(record.id)}
      control={
        editMode === 'delete' ? (
          <label className="relative z-10 flex size-11 shrink-0 items-center justify-center">
            <Checkbox
              checked={selectedIds.has(record.id)}
              onCheckedChange={() => handleToggleSelect(record.id)}
              aria-label={`${record.ticker} 선택`}
              disabled={loadingIds.size > 0}
            />
          </label>
        ) : (
          handle
        )
      }
    />
  )

  const isEmpty = records.length === 0

  return (
    <>
      {isEmpty ? (
        <EmptyState
          icon={<Search className="size-5" />}
          title="저장한 종목이 없어요."
          description="관심 있는 종목을 추가하면 주간 지표와 연결 키워드를 한눈에 볼 수 있어요."
          action={
            <Button asChild>
              <Link href="/search">
                <Plus aria-hidden className="size-4" />+ 추가
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-start justify-end gap-2 [&>div]:mb-0 [&>div[role=group]]:w-full">
            {editMode === 'none' && (
              <Button asChild>
                <Link href="/search">
                  <Plus aria-hidden className="size-4" />
                  종목 추가
                </Link>
              </Button>
            )}
            <StockEditToolbar
              mode={editMode}
              count={records.length}
              selectedCount={selectedIds.size}
              busy={loadingIds.size > 0}
              onModeChange={mode => {
                if (mode === 'delete') handleSelectDeleteMode()
                else handleSelectReorderMode()
              }}
              onSelectAll={handleSelectAll}
              onClear={() => setSelectedIds(new Set())}
              onCancel={closeEditMode}
              onDone={
                editMode === 'reorder' ? handleConfirmReorder : closeEditMode
              }
              onDelete={() => setDeleteConfirmOpen(true)}
            />
          </div>

          {editMode === 'reorder' ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={records.map(record => record.id)}
                strategy={verticalListSortingStrategy}
              >
                <table
                  aria-label="관심 종목"
                  className="bg-card block w-full overflow-hidden rounded-lg border"
                >
                  <StockListHeader />
                  <tbody className="block">
                    {records.map(record => (
                      <SortableStockRow key={record.id} record={record}>
                        {(handle, rowProps) =>
                          renderStockRow(record, handle, rowProps)
                        }
                      </SortableStockRow>
                    ))}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
          ) : (
            <table
              aria-label="관심 종목"
              className="bg-card block w-full overflow-hidden rounded-lg border"
            >
              <StockListHeader />
              <tbody className="block">
                {ordered.map(record => (
                  <Fragment key={record.id}>{renderStockRow(record)}</Fragment>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {editMode !== 'none' && (
        <p className="text-tertiary mt-4 text-xs leading-5">
          {editMode === 'delete'
            ? '삭제한 종목은 관심 종목 · 홈 · 사이드바에서 사라져요. 키워드 분석에 겹쳐 둔 종목은 그대로 남아요.'
            : '‘완료’를 누르면 이 기기(브라우저)에 순서가 저장돼요. ‘취소’하면 편집 전 순서로 돌아가요.'}
        </p>
      )}
      <StockDeleteDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        tickers={ordered
          .filter(record => selectedIds.has(record.id))
          .map(record => record.ticker)}
        busy={loadingIds.size > 0}
        onConfirm={() => void handleDeleteSelected()}
      />
    </>
  )
}
