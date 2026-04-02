'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, RefreshCw } from 'lucide-react'
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
import {
  groupKeywordsByIndex,
  getActiveIndices,
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
      <div className="mb-4 text-5xl">🔍</div>
      <h2 className="mb-2 text-lg font-semibold">
        아직 저장된 키워드가 없어요
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">
        관심 있는 키워드를 검색하고 저장해보세요
      </p>
      <Link href="/trends/search">
        <Button>검색하기</Button>
      </Link>
    </div>
  )
}

export function MyKeywordsClient({ initialKeywords }: MyKeywordsClientProps) {
  const [keywords, setKeywords] =
    useState<KeywordSearchRecord[]>(initialKeywords)
  const [selectedIndex, setSelectedIndex] = useState<string | null>(null)
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // fetch 로직을 useCallback으로 추출 (중복 제거)
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

  // 마운트 시 API에서 키워드 fetch (새로 저장된 키워드 반영)
  useEffect(() => {
    fetchKeywords()
  }, [fetchKeywords])

  // 키워드 그룹핑
  const grouped = useMemo(() => groupKeywordsByIndex(keywords), [keywords])

  // 활성 인덱스 (키워드가 있는 인덱스만)
  const activeIndices = useMemo(() => getActiveIndices(grouped), [grouped])

  // 초기 selectedIndex 설정 (첫 번째 활성 인덱스) - useEffect로 변경
  useEffect(() => {
    if (selectedIndex === null && activeIndices.length > 0) {
      setSelectedIndex(activeIndices[0])
    }
  }, [activeIndices, selectedIndex])

  // 선택된 인덱스의 키워드 목록
  const displayedKeywords = useMemo(() => {
    if (!selectedIndex) return []
    return grouped[selectedIndex] ?? []
  }, [selectedIndex, grouped])

  // 키워드 삭제 핸들러
  const handleDeleteKeyword = async (id: string) => {
    try {
      const response = await apiFetch(`/api/keyword-searches?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || '삭제에 실패했습니다.')
      }

      // 로컬 상태 업데이트
      const updated = keywords.filter(k => k.id !== id)
      setKeywords(updated)

      // 선택된 인덱스 재계산
      const newGrouped = groupKeywordsByIndex(updated)
      const newActiveIndices = getActiveIndices(newGrouped)

      if (selectedIndex && !newActiveIndices.includes(selectedIndex)) {
        setSelectedIndex(newActiveIndices[0] ?? null)
      }

      toast.success('키워드가 삭제되었습니다.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '삭제에 실패했습니다.'
      toast.error(message)
    } finally {
      setDeleteDialogId(null)
    }
  }

  // 헤더 영역
  const header = (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">내 키워드</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {keywords.length}개의 키워드 저장됨
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={async () => {
            await fetchKeywords()
            toast.success('키워드를 새로고침했습니다')
          }}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        <Link href="/trends/search">
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
    <Container className="py-8">
      {header}

      <div className="flex gap-4">
        {/* 좌측 사이드바: 인덱스 탭 */}
        <KeywordIndexSidebar
          activeIndices={activeIndices}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />

        {/* 우측: 키워드 그리드 */}
        <div className="min-w-0 flex-1">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {displayedKeywords.map(keyword => (
              <KeywordCard
                key={keyword.id}
                keyword={keyword}
                onDelete={setDeleteDialogId}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={deleteDialogId !== null}
        onOpenChange={open => {
          if (!open) setDeleteDialogId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>키워드를 삭제하시겠어요?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 저장된 키워드 데이터가 영구적으로
              삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteDialogId && handleDeleteKeyword(deleteDialogId)
              }
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
