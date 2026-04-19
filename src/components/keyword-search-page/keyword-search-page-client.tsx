'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import KeywordSearchForm from '../keyword-trends/keyword-search-form'
import { apiFetchJson } from '@/lib/fetch-client'
import {
  TIMEFRAMES,
  DEFAULT_TIMEFRAME,
  type Timeframe,
} from '@/lib/constants/trends'
import type { KeywordSearchRecord } from '@/types/database'
import { normalizeKeywordSpacing } from '@/lib/utils/keyword-normalization'

export default function KeywordSearchPageClient() {
  const router = useRouter()

  const [keyword, setKeyword] = useState('')
  const [geo, setGeo] = useState('')
  const [timeframe, setTimeframe] = useState<Timeframe | 'custom'>(
    DEFAULT_TIMEFRAME
  )
  const [gprop, setGprop] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async () => {
    const trimmedKeyword = normalizeKeywordSpacing(keyword)
    if (!trimmedKeyword) {
      toast.error('키워드를 입력해주세요')
      return
    }

    setIsLoading(true)

    try {
      // 1단계: 기존 키워드 확인
      console.log('[handleSearch] 기존 키워드 확인:', trimmedKeyword)
      const res = await apiFetchJson('/api/keyword-searches')
      const keywords = Array.isArray(res)
        ? res
        : ((res as Record<string, unknown>)?.data as unknown) || res

      if (!Array.isArray(keywords)) {
        throw new Error('Invalid response format')
      }

      const existingKeyword = keywords.find(
        (k: KeywordSearchRecord) =>
          normalizeKeywordSpacing(k.keyword) === trimmedKeyword
      )

      // 2단계: 기존 키워드가 있으면 상세 페이지로 이동
      if (existingKeyword) {
        console.log('[handleSearch] 기존 키워드 발견:', existingKeyword.id)
        toast.success('이미 저장된 키워드입니다')
        router.push(`/keywords/${existingKeyword.id}`)
        return
      }

      // 3단계: 새 키워드면 검색 페이지로 이동
      console.log('[handleSearch] 새 키워드 검색:', trimmedKeyword)
      const params = new URLSearchParams({
        keyword: trimmedKeyword,
        ...(geo && { geo }),
        ...(timeframe !== DEFAULT_TIMEFRAME && {
          timeframe: timeframe as string,
        }),
        ...(gprop && { gprop }),
      })

      router.push(`/trends/search?${params.toString()}`)
    } catch (error) {
      console.error('[handleSearch] 에러:', error)
      toast.error('검색 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-background min-h-screen p-6">
      <div className="mx-auto max-w-2xl">
        {/* 뒤로가기 */}
        <div className="mb-8">
          <a
            href="/trends"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            ← 내 키워드로 돌아가기
          </a>
        </div>

        {/* 제목 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">새 키워드 검색</h1>
          <p className="text-muted-foreground mt-2">
            Google Trends에서 검색할 새로운 키워드를 입력하세요
          </p>
        </div>

        {/* 검색 form */}
        <Card>
          <CardContent className="pt-6">
            <KeywordSearchForm
              keyword={keyword}
              geo={geo}
              timeframe={timeframe as string}
              gprop={gprop}
              isLoading={isLoading}
              onKeywordChange={setKeyword}
              onGeoChange={setGeo}
              onTimeframeChange={(tf: string) => {
                const validTimeframe = TIMEFRAMES.includes(tf as Timeframe)
                  ? (tf as Timeframe)
                  : DEFAULT_TIMEFRAME
                setTimeframe(validTimeframe)
              }}
              onGpropChange={setGprop}
              onSearch={handleSearch}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
