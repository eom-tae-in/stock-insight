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
import {
  Globe2,
  ImageIcon,
  Newspaper,
  ShoppingBag,
  Youtube,
} from 'lucide-react'
import { GEO_OPTIONS, GPROP_OPTIONS } from '@/lib/constants/trends'

const REGION_FLAG: Record<string, string> = {
  GLOBAL: '🌐',
  US: '🇺🇸',
  KR: '🇰🇷',
  JP: '🇯🇵',
  GB: '🇬🇧',
  DE: '🇩🇪',
  FR: '🇫🇷',
  CA: '🇨🇦',
  AU: '🇦🇺',
  IN: '🇮🇳',
  BR: '🇧🇷',
  CN: '🇨🇳',
  TW: '🇹🇼',
  HK: '🇭🇰',
  SG: '🇸🇬',
}

const searchTypeIcon = {
  WEB: Globe2,
  IMAGES: ImageIcon,
  NEWS: Newspaper,
  YOUTUBE: Youtube,
  SHOPPING: ShoppingBag,
} as const

interface KeywordSearchFormProps {
  keyword: string
  geo: string
  gprop: string
  isLoading: boolean
  onKeywordChange: (value: string) => void
  onGeoChange: (value: string) => void
  onGpropChange: (value: string) => void
  onSearch: () => void
}

export default function KeywordSearchForm({
  keyword,
  geo,
  gprop,
  isLoading,
  onKeywordChange,
  onGeoChange,
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

        <div className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={geo} onValueChange={onGeoChange}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="국가 선택" />
              </SelectTrigger>
              <SelectContent>
                {GEO_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden="true">
                        {REGION_FLAG[option.value]}
                      </span>
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={gprop} onValueChange={onGpropChange}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="검색범위 선택" />
              </SelectTrigger>
              <SelectContent>
                {GPROP_OPTIONS.map(option => {
                  const Icon = searchTypeIcon[option.value]
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
