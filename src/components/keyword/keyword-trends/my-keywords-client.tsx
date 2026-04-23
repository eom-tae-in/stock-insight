'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { GripVertical, Pencil, Search, Trash2, X } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Container } from '@/components/layout/container'
import { KeywordCard } from '@/components/keyword/keyword-trends/keyword-card'
import {
  filterKeywordsByLanguage,
  type KeywordLanguage,
} from '@/lib/utils/keyword-classifier'
import { toast } from 'sonner'
import { apiFetchJson, apiFetch } from '@/lib/fetch-client'
import type { KeywordRecord } from '@/types/database'

interface MyKeywordsClientProps {
  initialKeywords: KeywordRecord[]
}

type EditMode = 'none' | 'delete' | 'reorder'
type KeywordFilter = 'all' | KeywordLanguage
type KeywordSort = 'custom' | 'latest' | 'name'

function SortableKeywordCard({
  keyword,
  children,
}: {
  keyword: KeywordRecord
  children: ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: keyword.id })

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

function EmptyKeywordsState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="mb-4 text-5xl" aria-hidden="true">
        🔍
      </div>
      <h2 className="mb-2 text-lg font-semibold">
        아직 저장된 키워드가 없어요
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">
        관심 있는 키워드를 검색하고 저장해보세요
      </p>
      <Link href="/keyword-analysis/new">
        <Button>검색하기</Button>
      </Link>
    </div>
  )
}

function EmptyFilteredState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 text-4xl" aria-hidden="true">
        ✨
      </div>
      <h2 className="mb-2 text-base font-semibold">키워드가 없어요</h2>
      <p className="text-muted-foreground text-sm">
        검색어나 필터를 바꿔보세요
      </p>
    </div>
  )
}

export function MyKeywordsClient({ initialKeywords }: MyKeywordsClientProps) {
  const [keywords, setKeywords] = useState<KeywordRecord[]>(initialKeywords)
  const [isLoading, setIsLoading] = useState(false)
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set())

  const [searchQuery, setSearchQuery] = useState('')
  const [keywordFilter, setKeywordFilter] = useState<KeywordFilter>('all')
  const [keywordSort, setKeywordSort] = useState<KeywordSort>('custom')

  // 무한스크롤
  const [displayCount, setDisplayCount] = useState(100)
  const lastElementRef = useRef<HTMLDivElement>(null)

  // 편집 모드 관련 상태
  const [isEditMode, setIsEditMode] = useState(false)
  const [editMode, setEditMode] = useState<EditMode>('none')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<'selected' | null>(null)
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  // fetch 로직을 useCallback으로 추출
  const fetchKeywords = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiFetchJson<KeywordRecord[]>('/api/keywords')
      setKeywords(Array.isArray(data) ? data : [])
    } catch {
      // 실패해도 initialKeywords 사용
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 마운트 시 API에서 키워드 fetch
  useEffect(() => {
    fetchKeywords()
  }, [fetchKeywords])

  // 필터/정렬 변경 시 편집 모드 해제 + displayCount 초기화
  useEffect(() => {
    setDisplayCount(100)
    setIsEditMode(false)
    setEditMode('none')
    setSelectedIds(new Set())
  }, [keywordFilter, keywordSort, searchQuery])

  const filteredKeywords = useMemo(() => {
    const languageFiltered =
      keywordFilter === 'all'
        ? keywords
        : filterKeywordsByLanguage(keywords, keywordFilter)

    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) return languageFiltered

    return languageFiltered.filter(keyword =>
      keyword.keyword.toLowerCase().includes(normalizedQuery)
    )
  }, [keywordFilter, keywords, searchQuery])

  const sortedKeywords = useMemo(() => {
    const copied = [...filteredKeywords]

    if (keywordSort === 'latest') {
      copied.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      return copied
    }

    if (keywordSort === 'name') {
      copied.sort((a, b) => a.keyword.localeCompare(b.keyword, 'ko'))
      return copied
    }

    return copied
  }, [filteredKeywords, keywordSort])

  const displayedKeywords = useMemo(() => {
    return sortedKeywords.slice(0, displayCount)
  }, [displayCount, sortedKeywords])

  // 무한스크롤 감지
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (
          entries[0].isIntersecting &&
          displayedKeywords.length === displayCount
        ) {
          setDisplayCount(prev => prev + 100)
        }
      },
      { threshold: 0.1 }
    )

    if (lastElementRef.current) {
      observer.observe(lastElementRef.current)
    }

    return () => observer.disconnect()
  }, [displayCount, displayedKeywords.length])

  const closeEditMode = () => {
    setIsEditMode(false)
    setEditMode('none')
    setSelectedIds(new Set())
    setEditingId(null)
  }

  const handleToggleEditMode = () => {
    if (isEditMode) {
      closeEditMode()
      return
    }

    setIsEditMode(true)
    setEditMode('none')
    setSelectedIds(new Set())
    setEditingId(null)
  }

  const handleSelectDeleteMode = () => {
    setEditMode(prev => (prev === 'delete' ? 'none' : 'delete'))
    setSelectedIds(new Set())
    setEditingId(null)
  }

  const handleSelectReorderMode = () => {
    if (
      keywordSort !== 'custom' ||
      keywordFilter !== 'all' ||
      searchQuery.trim()
    ) {
      toast.info('순서 변경은 전체 목록의 직접 설정순에서 사용할 수 있습니다.')
      return
    }

    setEditMode(prev => (prev === 'reorder' ? 'none' : 'reorder'))
    setSelectedIds(new Set())
    setEditingId(null)
  }

  // 체크박스 토글
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // 전체 선택 (현재 탭의 키워드만)
  const handleSelectAll = () => {
    setSelectedIds(new Set(displayedKeywords.map(k => k.id)))
  }

  // 키워드 삭제
  const handleDeleteKeyword = async () => {
    try {
      const idsToDelete =
        deleteTarget === 'selected' ? Array.from(selectedIds) : []

      if (idsToDelete.length === 0) return

      // 병렬로 삭제 요청
      await Promise.all(
        idsToDelete.map(deleteId =>
          apiFetch(`/api/keywords/${deleteId}`, {
            method: 'DELETE',
          })
        )
      )

      // 로컬 상태 업데이트
      const updated = keywords.filter(k => !idsToDelete.includes(k.id))
      setKeywords(updated)

      // 상태 초기화
      setSelectedIds(new Set())
      setDeleteTarget(null)
      if (editMode === 'delete') {
        setEditMode('none')
      }

      const message =
        deleteTarget === 'selected'
          ? `${idsToDelete.length}개 키워드가 삭제되었습니다.`
          : '키워드가 삭제되었습니다.'

      toast.success(message)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '삭제에 실패했습니다.'
      toast.error(message)
    }
  }

  // 키워드 수정 저장
  const handleEditSave = async (id: string, newKeyword: string) => {
    try {
      const response = await apiFetch('/api/keywords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, keyword: newKeyword }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || '수정에 실패했습니다.')
      }

      // 로컬 상태 업데이트
      setKeywords(prev =>
        prev.map(k => (k.id === id ? { ...k, keyword: newKeyword } : k))
      )
      setEditingId(null)
      toast.success('키워드가 수정되었습니다.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '수정에 실패했습니다.'
      toast.error(message)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (editMode !== 'reorder' || !over || active.id === over.id) return

    const oldIndex = displayedKeywords.findIndex(
      keyword => keyword.id === active.id
    )
    const newIndex = displayedKeywords.findIndex(
      keyword => keyword.id === over.id
    )

    if (oldIndex < 0 || newIndex < 0) return

    const reorderedVisible = arrayMove(displayedKeywords, oldIndex, newIndex)
    const displayedIdSet = new Set(displayedKeywords.map(keyword => keyword.id))
    const reorderedQueue = [...reorderedVisible]

    setKeywords(prev =>
      prev.map(keyword => {
        if (!displayedIdSet.has(keyword.id)) return keyword

        const next = reorderedQueue.shift()
        return next ?? keyword
      })
    )
  }

  const handleConfirmReorder = async () => {
    setIsSavingOrder(true)
    try {
      const orderedIds = keywords.map(keyword => keyword.id)
      await apiFetchJson('/api/keywords/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      })

      toast.success('키워드 위치가 저장되었습니다.')
      closeEditMode()
      await fetchKeywords()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '위치 저장에 실패했습니다.'
      toast.error(message)
    } finally {
      setIsSavingOrder(false)
    }
  }

  const handleEditDone = () => {
    if (editMode === 'reorder') {
      void handleConfirmReorder()
      return
    }

    closeEditMode()
  }

  const handleRefreshKeyword = async (id: string) => {
    setRefreshingIds(prev => new Set(prev).add(id))

    try {
      await apiFetchJson(`/api/keywords/${id}/refreshes`, {
        method: 'POST',
      })
      await fetchKeywords()
      toast.success('키워드를 최신화했습니다.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '키워드 최신화에 실패했습니다.'
      toast.error(message)
    } finally {
      setRefreshingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // 헤더 영역
  const header = (
    <div className="mb-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">내 키워드</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            저장한 키워드의 검색 트렌드와 커스텀 비교 차트를 확인합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/keyword-analysis/new">
            <Button>
              <Search className="mr-2 h-4 w-4" />새 키워드 검색
            </Button>
          </Link>
        </div>
      </div>

      <div className="text-muted-foreground space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/30">
        <p className="text-sm">
          📊 Google Trends 데이터는 완료된 전주까지 수집됩니다.
        </p>
        <p className="text-sm">
          검색량 기반 지표, 13주 이동평균, 52주 전 대비 증감률은 주간 검색
          관심도 기준으로 계산됩니다.
        </p>
      </div>
    </div>
  )

  // 빈 상태 (로딩 완료 후에만 표시)
  if (!isLoading && keywords.length === 0) {
    return (
      <Container className="py-8">
        {header}
        <EmptyKeywordsState />
      </Container>
    )
  }

  // 데이터 있음
  return (
    <Container className="py-8 pb-24 sm:pb-8">
      {header}

      <div className="space-y-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="키워드 검색"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: '전체' },
                { value: 'ko', label: '한글' },
                { value: 'en', label: '영어' },
                { value: 'symbol', label: '기타' },
              ].map(option => (
                <Button
                  key={option.value}
                  type="button"
                  variant={
                    keywordFilter === option.value ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() =>
                    setKeywordFilter(option.value as KeywordFilter)
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <Select
              value={keywordSort}
              onValueChange={value => setKeywordSort(value as KeywordSort)}
            >
              <SelectTrigger className="h-9 w-full lg:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">직접 설정순</SelectItem>
                <SelectItem value="latest">최신순</SelectItem>
                <SelectItem value="name">이름순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="min-w-0">
          {keywords.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-muted-foreground text-sm">
                {displayedKeywords.length}개 표시 중
              </div>

              {!isEditMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleEditMode}
                  disabled={displayedKeywords.length === 0}
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
                    disabled={isSavingOrder}
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
                  disabled={isSavingOrder}
                  className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <X className="mr-2 h-4 w-4" />
                  완료
                </Button>
              )}
            </div>
          )}

          {editMode === 'delete' && displayedKeywords.length > 0 && (
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
                  onClick={() => {
                    setDeleteTarget('selected')
                  }}
                  className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
              )}
            </div>
          )}

          {displayedKeywords.length === 0 ? (
            <EmptyFilteredState />
          ) : (
            <>
              {editMode === 'reorder' ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={displayedKeywords.map(keyword => keyword.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {displayedKeywords.map((keyword, index) => {
                        const isLastElement =
                          index === displayedKeywords.length - 1
                        return (
                          <div
                            key={keyword.id}
                            ref={isLastElement ? lastElementRef : null}
                          >
                            <SortableKeywordCard keyword={keyword}>
                              <KeywordCard
                                keyword={keyword}
                                isManageMode
                                mode="reorder"
                                isSelected={false}
                                isEditing={false}
                              />
                            </SortableKeywordCard>
                          </div>
                        )
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {displayedKeywords.map((keyword, index) => {
                    const isLastElement = index === displayedKeywords.length - 1
                    return (
                      <div
                        key={keyword.id}
                        ref={isLastElement ? lastElementRef : null}
                      >
                        <KeywordCard
                          keyword={keyword}
                          isManageMode={editMode === 'delete'}
                          mode={editMode === 'delete' ? 'delete' : 'normal'}
                          isSelected={selectedIds.has(keyword.id)}
                          isEditing={editingId === keyword.id}
                          onToggleSelect={() => handleToggleSelect(keyword.id)}
                          onEditStart={() => setEditingId(keyword.id)}
                          onEditSave={handleEditSave}
                          onEditCancel={() => setEditingId(null)}
                          onRefresh={handleRefreshKeyword}
                          isRefreshing={refreshingIds.has(keyword.id)}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={open => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>선택한 키워드를 삭제하시겠어요?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 저장된 키워드 데이터가 영구적으로
              삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteKeyword()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  )
}
