'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Timeframe 타입은 keyword-trends-client에서 export 필요하므로,
// 여기서는 string으로 유지하고 부모에서 타입 강제
interface KeywordSearchFormProps {
  keyword: string
  geo: string
  timeframe: string
  gprop: string
  isLoading: boolean
  onKeywordChange: (value: string) => void
  onGeoChange: (value: string) => void
  onTimeframeChange: (value: string) => void
  onGpropChange: (value: string) => void
  onSearch: () => void
}

export default function KeywordSearchForm({
  keyword,
  geo,
  timeframe,
  gprop,
  isLoading,
  onKeywordChange,
  onGeoChange,
  onTimeframeChange,
  onGpropChange,
  onSearch,
}: KeywordSearchFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>키워드 검색</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="예: artificial intelligence, 전기차"
            value={keyword}
            onChange={e => onKeywordChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            disabled={isLoading}
            maxLength={100}
          />
          <Button onClick={onSearch} disabled={isLoading} className="min-w-24">
            {isLoading ? '로딩중...' : '조회'}
          </Button>
        </div>

        {/* F023: 국가/기간/범위 선택 - Google Trends 스타일 (flex 레이아웃) */}
        <div className="flex flex-wrap gap-2">
          <Select
            value={geo || 'all'}
            onValueChange={value => onGeoChange(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="h-9 min-w-[120px] flex-1">
              <SelectValue placeholder="국가 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="US">미국</SelectItem>
              <SelectItem value="KR">한국</SelectItem>
              <SelectItem value="JP">일본</SelectItem>
              <SelectItem value="CN">중국</SelectItem>
              <SelectItem value="GB">영국</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeframe} onValueChange={onTimeframeChange}>
            <SelectTrigger className="h-9 min-w-[100px] flex-1">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="w">1주</SelectItem>
              <SelectItem value="1y">1년</SelectItem>
              <SelectItem value="2y">2년</SelectItem>
              <SelectItem value="3y">3년</SelectItem>
              <SelectItem value="4y">4년</SelectItem>
              <SelectItem value="5y">5년</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={gprop || 'web'}
            onValueChange={value => onGpropChange(value === 'web' ? '' : value)}
          >
            <SelectTrigger className="h-9 min-w-[120px] flex-1">
              <SelectValue placeholder="검색범위 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="web">웹 검색</SelectItem>
              <SelectItem value="youtube">유튜브</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
