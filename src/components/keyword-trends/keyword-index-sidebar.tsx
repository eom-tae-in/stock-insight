'use client'

import { cn } from '@/lib/utils'
import { ALL_INDICES } from '@/lib/utils/keyword-classifier'

interface KeywordIndexSidebarProps {
  activeIndices: string[]
  selectedIndex: string | null
  onSelect: (index: string) => void
}

export function KeywordIndexSidebar({
  activeIndices,
  selectedIndex,
  onSelect,
}: KeywordIndexSidebarProps) {
  return (
    <aside className={cn('w-12 shrink-0 border-r', 'bg-card')}>
      <nav
        className={cn(
          'sticky top-16 flex flex-col gap-1 px-1 py-2',
          'max-h-[calc(100vh-5rem)] overflow-y-auto'
        )}
      >
        {ALL_INDICES.map(index => {
          const isActive = activeIndices.includes(index)
          const isSelected = selectedIndex === index

          return (
            <button
              key={index}
              onClick={() => isActive && onSelect(index)}
              disabled={!isActive}
              className={cn(
                'h-8 w-full rounded text-xs font-medium transition-all',
                'flex items-center justify-center',
                // 선택됨
                isSelected && 'bg-primary text-primary-foreground shadow-sm',
                // 활성 (키워드 있음, 미선택)
                isActive &&
                  !isSelected &&
                  'text-foreground hover:bg-muted cursor-pointer',
                // 비활성 (키워드 없음)
                !isActive &&
                  'text-muted-foreground/30 pointer-events-none cursor-default'
              )}
              aria-label={`${index} 키워드로 필터링`}
              aria-pressed={isSelected}
            >
              {index}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
