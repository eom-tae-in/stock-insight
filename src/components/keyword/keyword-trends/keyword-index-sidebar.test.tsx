import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { KeywordIndexSidebar } from './keyword-index-sidebar'
import type { KeywordRecord } from '@/types/database'

function keyword(id: string, value: string): KeywordRecord {
  return {
    id,
    user_id: 'user-1',
    keyword: value,
    region: 'GLOBAL',
    search_type: 'WEB',
    trends_data: [],
    searched_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

describe('KeywordIndexSidebar', () => {
  it('renders active index counts and calls select only for active indexes', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <KeywordIndexSidebar
        grouped={{ A: [keyword('1', 'AI')], B: [keyword('2', 'Battery')] }}
        selectedIndex="A"
        onSelect={onSelect}
        languageTab="en"
        onLanguageTabChange={vi.fn()}
      />
    )

    expect(
      screen.getByRole('button', { name: '전체 키워드로 필터링' })
    ).toHaveTextContent('2')
    expect(
      screen.getByRole('button', { name: 'A 키워드로 필터링' })
    ).toHaveClass('bg-primary')
    expect(
      screen.getByRole('button', { name: 'C 키워드로 필터링' })
    ).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'B 키워드로 필터링' }))
    await user.click(screen.getByRole('button', { name: 'C 키워드로 필터링' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('B')
  })

  it.each([
    { tab: '한글', expected: 'ko' },
    { tab: '영어', expected: 'en' },
    { tab: '기호', expected: 'symbol' },
  ])('maps $tab tab clicks to language changes', async ({ tab, expected }) => {
    const user = userEvent.setup()
    const onLanguageTabChange = vi.fn()

    render(
      <KeywordIndexSidebar
        grouped={{}}
        selectedIndex={null}
        onSelect={vi.fn()}
        languageTab="en"
        onLanguageTabChange={onLanguageTabChange}
      />
    )

    await user.click(screen.getByRole('button', { name: `${tab} 카테고리` }))

    expect(onLanguageTabChange).toHaveBeenCalledWith(expected)
  })
})
