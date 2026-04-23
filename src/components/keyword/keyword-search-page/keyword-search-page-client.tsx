'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import KeywordSearchForm from '../keyword-trends/keyword-search-form'
import {
  GEO_OPTIONS,
  GPROP_OPTIONS,
  DEFAULT_GEO,
  DEFAULT_TIMEFRAME_VALUE,
  DEFAULT_GPROP,
  type GeoValue,
  type GpropValue,
} from '@/lib/constants/trends'
import { normalizeKeywordSpacing } from '@/lib/utils/keyword-normalization'

export default function KeywordSearchPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [keyword, setKeyword] = useState('')
  const [geo, setGeo] = useState<GeoValue>(DEFAULT_GEO)
  const [gprop, setGprop] = useState<GpropValue>(DEFAULT_GPROP)

  // URL 파라미터에서 키워드 자동 채우기
  useEffect(() => {
    const keywordParam = searchParams.get('keyword')
    if (keywordParam) {
      setKeyword(decodeURIComponent(keywordParam))
    }
  }, [searchParams])

  const handleSearch = () => {
    const trimmedKeyword = normalizeKeywordSpacing(keyword)
    if (!trimmedKeyword) {
      toast.error('키워드를 입력해주세요')
      return
    }

    // /new는 순수 입력/이동만 담당하고 실제 조회는 /search에서 REST API로 수행한다.
    // 조회 조건(keyword, geo, gprop)을 URL query로 전달한다.
    // 분석 원본 데이터 범위는 항상 5Y로 고정한다.
    router.push(
      `/keyword-analysis/search?keyword=${encodeURIComponent(
        trimmedKeyword
      )}&geo=${geo}&timeframe=${DEFAULT_TIMEFRAME_VALUE}&gprop=${gprop}`
    )
  }

  return (
    <div className="bg-background min-h-screen p-6">
      <div className="mx-auto max-w-2xl">
        {/* 뒤로가기 */}
        <div className="mb-8">
          <a
            href="/keyword-analysis"
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
              gprop={gprop}
              isLoading={false}
              onKeywordChange={setKeyword}
              onGeoChange={(geoValue: string) => {
                const validGeo = GEO_OPTIONS.some(opt => opt.value === geoValue)
                  ? (geoValue as GeoValue)
                  : DEFAULT_GEO
                setGeo(validGeo)
              }}
              onGpropChange={(gpropValue: string) => {
                const validGprop = GPROP_OPTIONS.some(
                  opt => opt.value === gpropValue
                )
                  ? (gpropValue as GpropValue)
                  : DEFAULT_GPROP
                setGprop(validGprop)
              }}
              onSearch={handleSearch}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
