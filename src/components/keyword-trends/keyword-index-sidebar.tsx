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
    <aside className={cn('border-border/50 bg-card/50 w-12 shrink-0 border-r')}>
      <nav
        className={cn(
          'sticky top-16 flex flex-col gap-1.5 px-2 py-3',
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
                'h-9 w-9 rounded-lg text-xs font-medium transition-all duration-200',
                'flex items-center justify-center',
                'relative',
                // 선택됨
                isSelected && [
                  'from-primary to-primary/80 bg-gradient-to-br',
                  'text-primary-foreground shadow-primary/30 shadow-md',
                  'scale-105',
                ],
                // 활성 (키워드 있음, 미선택)
                isActive &&
                  !isSelected && [
                    'text-foreground/80',
                    'hover:bg-muted/70 cursor-pointer',
                    'hover:text-foreground hover:shadow-sm',
                  ],
                // 비활성 (키워드 없음)
                !isActive && [
                  'text-muted-foreground/40',
                  'pointer-events-none cursor-default',
                ]
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
