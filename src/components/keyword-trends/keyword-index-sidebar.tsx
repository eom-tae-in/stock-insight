'use client'

import { cn } from '@/lib/utils'

interface KeywordIndexSidebarProps {
  categoryIndices: string[]
  selectedIndex: string | null
  onSelect: (index: string) => void
}

export function KeywordIndexSidebar({
  categoryIndices,
  selectedIndex,
  onSelect,
}: KeywordIndexSidebarProps) {
  return (
    <aside
      className={cn(
        'border-border/30 w-16 shrink-0 border-r',
        'from-card to-card/50 bg-gradient-to-b'
      )}
    >
      <nav
        className={cn(
          'sticky top-16 flex flex-col gap-2.5 px-3 py-4',
          'max-h-[calc(100vh-5rem)] overflow-y-auto'
        )}
      >
        {categoryIndices.map(index => {
          const isSelected = selectedIndex === index

          return (
            <button
              key={index}
              onClick={() => onSelect(index)}
              className={cn(
                'h-11 w-10 rounded-xl text-sm font-semibold transition-all duration-200',
                'flex items-center justify-center',
                // 선택됨
                isSelected && [
                  'from-primary to-primary/85 bg-gradient-to-br',
                  'text-primary-foreground shadow-primary/25 shadow-lg',
                  'scale-110',
                ],
                // 미선택
                !isSelected && [
                  'border-border/20 border',
                  'text-foreground/70 hover:text-foreground',
                  'hover:bg-muted/80 hover:shadow-md',
                  'cursor-pointer',
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
