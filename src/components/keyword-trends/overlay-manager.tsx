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
import type { SearchRecord } from '@/types/database'

interface OverlayManagerProps {
  selectedSearches: SearchRecord[]
  availableSearches: SearchRecord[]
  searchFilter: string
  isSaving: boolean
  onAddOverlay: (searchId: string) => void
  onRemoveOverlay: (searchId: string) => void
  onSearchFilterChange: (value: string) => void
  onSaveCombo: () => void
}

export default function OverlayManager({
  selectedSearches,
  availableSearches,
  searchFilter,
  isSaving,
  onAddOverlay,
  onRemoveOverlay,
  onSearchFilterChange,
  onSaveCombo,
}: OverlayManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>종목 오버레이 추가 (최대 5개)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* F026: 종목 검색 필터 */}
        <Input
          placeholder="종목 검색 (Ticker 또는 회사명)"
          value={searchFilter}
          onChange={e => onSearchFilterChange(e.target.value)}
          className="h-9"
        />

        <div className="flex gap-2">
          <Select onValueChange={onAddOverlay}>
            <SelectTrigger>
              <SelectValue placeholder="저장된 종목 선택" />
            </SelectTrigger>
            <SelectContent>
              {availableSearches
                .filter(
                  search =>
                    !searchFilter ||
                    search.ticker
                      .toLowerCase()
                      .includes(searchFilter.toLowerCase()) ||
                    search.company_name
                      .toLowerCase()
                      .includes(searchFilter.toLowerCase())
                )
                .map(search => (
                  <SelectItem key={search.id} value={search.id}>
                    {search.ticker} - {search.company_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* 선택된 오버레이 목록 */}
        {selectedSearches.length > 0 && (
          <div className="space-y-2">
            {selectedSearches.map((search, idx) => (
              <div
                key={search.id}
                className="bg-muted flex items-center justify-between rounded p-2"
              >
                <span className="text-sm font-medium">
                  {idx + 1}. {search.ticker} - {search.company_name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveOverlay(search.id)}
                  aria-label={`${search.ticker} 오버레이 제거`}
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* 저장 버튼 */}
        <Button onClick={onSaveCombo} disabled={isSaving} className="w-full">
          {isSaving ? '저장중...' : '현재 조합 저장'}
        </Button>
      </CardContent>
    </Card>
  )
}
