'use client'

import { cn } from '@/lib/utils'
import {
  ALPHA_INDICES,
  HANGUL_INITIALS,
  type KeywordLanguage,
} from '@/lib/utils/keyword-classifier'
import type { KeywordSearchRecord } from '@/types/database'

interface KeywordIndexSidebarProps {
  grouped: Record<string, KeywordSearchRecord[]>
  selectedIndex: string | null
  onSelect: (index: string) => void
  languageTab: KeywordLanguage
  onLanguageTabChange: (language: KeywordLanguage) => void
}

// 카테고리 탭 타입
type CategoryTab = '한글' | '영어' | '기호'

// 각 탭에 해당하는 인덱스 목록
const CATEGORY_INDICES: Record<CategoryTab, string[]> = {
  한글: HANGUL_INITIALS,
  영어: ALPHA_INDICES,
  기호: ['#'],
}

export function KeywordIndexSidebar({
  grouped,
  selectedIndex,
  onSelect,
  languageTab,
  onLanguageTabChange,
}: KeywordIndexSidebarProps) {
  // 부모의 languageTab을 카테고리 탭으로 변환
  const getCategoryTab = (lang: KeywordLanguage): CategoryTab => {
    if (lang === 'ko') return '한글'
    if (lang === 'en') return '영어'
    return '기호'
  }

  const getLanguageTab = (tab: CategoryTab): KeywordLanguage => {
    if (tab === '한글') return 'ko'
    if (tab === '영어') return 'en'
    return 'symbol'
  }

  const activeTab = getCategoryTab(languageTab)

  const isActive = (index: string) => (grouped[index]?.length ?? 0) > 0

  // 현재 탭의 인덱스 목록
  const currentIndices = CATEGORY_INDICES[activeTab]

  // 탭 버튼 목록
  const tabs: CategoryTab[] = ['한글', '영어', '기호']

  return (
    <aside className="border-border/20 from-card to-card/40 flex w-28 shrink-0 flex-col border-r bg-gradient-to-b">
      {/* 상단 탭 영역 */}
      <div className="border-border/20 flex shrink-0 border-b">
        {tabs.map(tab => {
          const isSelected = activeTab === tab
          // 해당 탭에 활성 키워드가 하나라도 있는지 확인
          const hasActiveKeyword = CATEGORY_INDICES[tab].some(idx =>
            isActive(idx)
          )

          return (
            <button
              key={tab}
              onClick={() => {
                // 부모에 언어 탭 변경 알리기
                onLanguageTabChange(getLanguageTab(tab))
              }}
              className={cn(
                'flex-1 py-2 text-[10px] font-semibold transition-all duration-200',
                'relative focus-visible:outline-none',
                // 선택된 탭
                isSelected
                  ? 'text-primary'
                  : [
                      'text-muted-foreground/60 hover:text-muted-foreground',
                      'cursor-pointer',
                    ]
              )}
              aria-label={`${tab} 카테고리`}
            >
              {tab}
              {/* 활성 탭 하단 인디케이터 */}
              {isSelected && (
                <span className="bg-primary absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full" />
              )}
              {/* 활성 키워드 존재 표시 dot */}
              {hasActiveKeyword && !isSelected && (
                <span className="bg-primary/40 absolute top-1.5 right-1.5 h-1 w-1 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* 중앙 스크롤 리스트 */}
      <div
        className={cn(
          'flex-1 overflow-y-auto px-2 py-2',
          '[&::-webkit-scrollbar]:w-1',
          '[&::-webkit-scrollbar-track]:bg-transparent',
          '[&::-webkit-scrollbar-thumb]:bg-border/40',
          '[&::-webkit-scrollbar-thumb]:rounded-full'
        )}
      >
        <div className="flex flex-col gap-0.5">
          {currentIndices.map(index => {
            const active = isActive(index)
            const selected = selectedIndex === index

            return (
              <button
                key={index}
                onClick={() => active && onSelect(index)}
                disabled={!active}
                className={cn(
                  'h-8 w-full rounded-md px-3 text-xs font-medium transition-all duration-150',
                  'flex items-center justify-between',
                  'focus-visible:ring-primary/50 focus-visible:ring-1 focus-visible:outline-none',
                  // 선택됨
                  selected && [
                    'bg-primary text-primary-foreground',
                    'shadow-primary/20 shadow-sm',
                  ],
                  // 활성 미선택
                  active &&
                    !selected && [
                      'text-foreground/80 hover:bg-muted/60 hover:text-foreground',
                      'cursor-pointer',
                    ],
                  // 비활성
                  !active && ['text-muted-foreground/25', 'cursor-default']
                )}
                aria-label={`${index} 키워드로 필터링`}
                aria-pressed={selected}
              >
                <span>{index}</span>
                {/* 활성 상태일 때 키워드 개수 표시 */}
                {active && (
                  <span
                    className={cn(
                      'text-[9px] leading-none tabular-nums',
                      selected
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground/50'
                    )}
                  >
                    {grouped[index]?.length ?? 0}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
