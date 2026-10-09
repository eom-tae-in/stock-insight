'use client'

import { SearchField } from '@/components/shared/search-field'
import { Segmented } from '@/components/shared/segmented'
import type { StockChangeFilter } from '@/lib/stock/list-filter'

export function StockListFilters({
  query,
  filter,
  counts,
  staleCount,
  busy,
  onQueryChange,
  onFilterChange,
}: {
  readonly query: string
  readonly filter: StockChangeFilter
  readonly counts: Readonly<Record<StockChangeFilter, number>>
  readonly staleCount: number
  readonly busy: boolean
  readonly onQueryChange: (value: string) => void
  readonly onFilterChange: (value: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-3 xl:basis-auto">
      <div className="w-full xl:w-[280px]">
        <SearchField
          label="티커·회사명으로 찾기"
          placeholder="티커·회사명으로 찾기"
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          disabled={busy}
          showShortcut={false}
          className="pr-3"
        />
      </div>
      <Segmented
        label="종목 등락 필터"
        value={filter}
        onValueChange={onFilterChange}
        disabled={busy}
        options={[
          { value: 'all', label: `전체 ${counts.all}` },
          { value: 'up', label: `상승 ${counts.up}` },
          { value: 'down', label: `하락 ${counts.down}` },
        ]}
        className="w-full xl:w-auto [&>button]:flex-1"
      />
      <p className="text-text-secondary flex items-center gap-1.5 text-xs xl:ml-auto">
        <span aria-hidden className="bg-warning size-1.5 rounded-full" />
        2주 이상 갱신 안 된 종목 {staleCount}
      </p>
    </div>
  )
}
