'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Search, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { KeywordCard } from '@/components/keyword-trends/keyword-card'
import { KeywordIndexSidebar } from '@/components/keyword-trends/keyword-index-sidebar'
import { KeywordManageActionBar } from '@/components/keyword-trends/keyword-manage-action-bar'
import {
  groupKeywordsByIndex,
  getActiveIndices,
  ALL_INDICES,
  filterKeywordsByLanguage,
  SHOW_ALL_INDEX,
  type KeywordLanguage,
} from '@/lib/utils/keyword-classifier'
import { toast } from 'sonner'
import { apiFetchJson, apiFetch } from '@/lib/fetch-client'
import type { KeywordSearchRecord } from '@/types/database'

interface MyKeywordsClientProps {
  initialKeywords: KeywordSearchRecord[]
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
      <Link href="/keywords/search">
        <Button>검색하기</Button>
      </Link>
    </div>
  )
}

function EmptyLanguageState({ language }: { language: KeywordLanguage }) {
  const languageText = {
    ko: '한글',
    en: '영어',
    symbol: '숫자/기호',
  }[language]

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 text-4xl" aria-hidden="true">
        ✨
      </div>
      <h2 className="mb-2 text-base font-semibold">
        {languageText} 키워드가 없어요
      </h2>
      <p className="text-muted-foreground text-sm">
        다른 언어 탭을 선택해보세요
      </p>
    </div>
  )
}

export function MyKeywordsClient({ initialKeywords }: MyKeywordsClientProps) {
  const [keywords, setKeywords] =
    useState<KeywordSearchRecord[]>(initialKeywords)
  const [selectedIndex, setSelectedIndex] = useState<string | null>(
    SHOW_ALL_INDEX
  )
  const [isLoading, setIsLoading] = useState(false)

  // 언어 탭 필터링
  const [languageTab, setLanguageTab] = useState<KeywordLanguage>('ko')

  // 무한스크롤
  const [displayCount, setDisplayCount] = useState(100)
  const lastElementRef = useRef<HTMLDivElement>(null)

  // 관리 모드 관련 상태
  const [isManageMode, setIsManageMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<
    'selected' | 'all' | 'single' | null
  >(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // fetch 로직을 useCallback으로 추출
  const fetchKeywords = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiFetchJson<KeywordSearchRecord[]>(
        '/api/keyword-searches'
      )
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

  // 언어별 필터링 → 인덱스 그룹핑
  const filteredKeywords = useMemo(
    () => filterKeywordsByLanguage(keywords, languageTab),
    [keywords, languageTab]
  )

  const grouped = useMemo(
    () => groupKeywordsByIndex(filteredKeywords),
    [filteredKeywords]
  )

  // 선택된 인덱스 유효성 확인 및 필요시 업데이트
  useEffect(() => {
    // "전체" 상태면 grouped 확인 스킵
    if (selectedIndex === SHOW_ALL_INDEX) return

    // grouped가 변경되었을 때 특정 인덱스가 유효한지 확인
    if (!selectedIndex || !(grouped[selectedIndex]?.length > 0)) {
      const first = ALL_INDICES.find(idx => (grouped[idx]?.length ?? 0) > 0)
      setSelectedIndex(first ?? SHOW_ALL_INDEX)
    }
  }, [selectedIndex, grouped])

  // 언어 탭 변경 시 selectedIndex 초기화 + 관리 모드 해제 + displayCount 초기화
  useEffect(() => {
    setSelectedIndex(SHOW_ALL_INDEX)
    setDisplayCount(100)
    setIsManageMode(false)
    setSelectedIds(new Set())
  }, [languageTab])

  // 선택된 인덱스의 키워드 목록 (무한스크롤 적용)
  const displayedKeywords = useMemo(() => {
    if (!selectedIndex) return []

    // "전체" 선택 시: 모든 인덱스의 키워드를 합쳐서 반환
    if (selectedIndex === SHOW_ALL_INDEX) {
      const allKeywords: KeywordSearchRecord[] = []
      ALL_INDICES.forEach(idx => {
        const keywordsForIndex = grouped[idx] ?? []
        allKeywords.push(...keywordsForIndex)
      })
      return allKeywords.slice(0, displayCount)
    }

    // 특정 인덱스 선택 시: 해당 인덱스만 반환
    const indexKeywords = grouped[selectedIndex] ?? []
    return indexKeywords.slice(0, displayCount)
  }, [selectedIndex, grouped, displayCount])

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

  // 관리 모드 토글
  const handleToggleManageMode = () => {
    if (isManageMode) {
      // 관리 모드 종료
      setIsManageMode(false)
      setSelectedIds(new Set())
      setEditingId(null)
    } else {
      // 관리 모드 진입
      setIsManageMode(true)
      setSelectedIds(new Set())
      setEditingId(null)
    }
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

  // 선택 해제
  const handleDeselectAll = () => {
    setSelectedIds(new Set())
  }

  // 키워드 삭제 (단건 또는 일괄)
  const handleDeleteKeyword = async () => {
    try {
      const idsToDelete =
        deleteTarget === 'selected'
          ? Array.from(selectedIds)
          : deleteTarget === 'all'
            ? keywords.map(k => k.id)
            : deleteTarget === 'single' && deletingId
              ? [deletingId]
              : []

      if (idsToDelete.length === 0) return

      // 병렬로 삭제 요청
      await Promise.all(
        idsToDelete.map(deleteId =>
          apiFetch(`/api/keyword-searches?id=${deleteId}`, {
            method: 'DELETE',
          })
        )
      )

      // 로컬 상태 업데이트
      const updated = keywords.filter(k => !idsToDelete.includes(k.id))
      setKeywords(updated)

      // 선택된 인덱스 재계산
      const newGrouped = groupKeywordsByIndex(updated)
      const newActiveIndices = getActiveIndices(newGrouped)

      if (selectedIndex && !newActiveIndices.includes(selectedIndex)) {
        setSelectedIndex(newActiveIndices[0] ?? null)
      }

      // 상태 초기화
      setSelectedIds(new Set())
      setDeleteTarget(null)
      setDeletingId(null)

      const message =
        deleteTarget === 'all'
          ? '모든 키워드가 삭제되었습니다.'
          : deleteTarget === 'selected'
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
      const response = await apiFetch('/api/keyword-searches', {
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

  // 헤더 영역
  const header = (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold">내 키워드</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {keywords.length}개의 키워드 저장됨
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant={isManageMode ? 'default' : 'outline'}
          onClick={handleToggleManageMode}
          disabled={keywords.length === 0}
          aria-pressed={isManageMode}
        >
          <Settings className="mr-2 h-4 w-4" />
          {isManageMode ? '완료' : '관리'}
        </Button>
        <Link href="/keywords/search">
          <Button>
            <Search className="mr-2 h-4 w-4" />새 키워드 검색
          </Button>
        </Link>
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

      <div className="flex gap-3">
        {/* 좌측 사이드바: 언어 탭 + 인덱스 탭 */}
        <KeywordIndexSidebar
          grouped={grouped}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          languageTab={languageTab}
          onLanguageTabChange={setLanguageTab}
        />

        {/* 우측: 키워드 그리드 + 액션바 */}
        <div className="min-w-0 flex-1">
          {displayedKeywords.length === 0 ? (
            <EmptyLanguageState language={languageTab} />
          ) : (
            <>
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
                        isManageMode={isManageMode}
                        isSelected={selectedIds.has(keyword.id)}
                        isEditing={editingId === keyword.id}
                        onDelete={() => {
                          setDeleteTarget('single')
                          setDeletingId(keyword.id)
                        }}
                        onToggleSelect={() => handleToggleSelect(keyword.id)}
                        onEditStart={() => setEditingId(keyword.id)}
                        onEditSave={handleEditSave}
                        onEditCancel={() => setEditingId(null)}
                      />
                    </div>
                  )
                })}
              </div>

              {/* 관리 모드 액션바 */}
              {isManageMode && (
                <KeywordManageActionBar
                  totalCount={displayedKeywords.length}
                  selectedCount={selectedIds.size}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                  onDeleteSelected={() => {
                    setDeleteTarget('selected')
                  }}
                  onDeleteAll={() => {
                    setDeleteTarget('all')
                  }}
                  onDone={handleToggleManageMode}
                />
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
            setDeletingId(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget === 'all'
                ? '모든 키워드를 삭제하시겠어요?'
                : deleteTarget === 'selected'
                  ? '선택한 키워드를 삭제하시겠어요?'
                  : '키워드를 삭제하시겠어요?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 저장된 키워드 데이터가 영구적으로
              삭제됩니다.
              {deleteTarget === 'all' && (
                <span className="text-destructive mt-2 block font-medium">
                  <span aria-hidden="true">⚠️</span> 모든 키워드가 삭제됩니다!
                </span>
              )}
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
