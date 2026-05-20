import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import KeywordSearchList from './keyword-search-list'
import type { KeywordRecord } from '@/types/database'

function makeKeyword(overrides: Partial<KeywordRecord> = {}): KeywordRecord {
  return {
    id: 'keyword-1',
    user_id: 'user-1',
    keyword: 'artificial intelligence',
    region: 'GLOBAL',
    search_type: 'WEB',
    ma13: 55.123,
    yoy_change: 14.567,
    trends_data: [],
    searched_at: '2026-01-15T00:00:00.000Z',
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
    ...overrides,
  }
}

describe('KeywordSearchList', () => {
  it('renders an empty state when there are no saved keywords', () => {
    render(
      <KeywordSearchList keywords={[]} onRestore={vi.fn()} onDelete={vi.fn()} />
    )

    expect(screen.getByText('저장된 키워드가 없습니다')).toBeInTheDocument()
  })

  it('renders saved keyword metrics and formatted date', () => {
    render(
      <KeywordSearchList
        keywords={[makeKeyword()]}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(screen.getByText('artificial intelligence')).toBeInTheDocument()
    expect(screen.getByText('55.12')).toBeInTheDocument()
    expect(screen.getByText('+14.57%')).toHaveClass('text-green-600')
    expect(screen.getByText('Jan 15, 2026')).toBeInTheDocument()
  })

  it.each([
    { yoyChange: -3.2, expectedText: '-3.20%', expectedClass: 'text-red-600' },
    {
      yoyChange: undefined,
      expectedText: 'N/A',
      expectedClass: 'text-gray-500',
    },
  ])(
    'renders YoY fallback and sign styles',
    ({ yoyChange, expectedText, expectedClass }) => {
      render(
        <KeywordSearchList
          keywords={[makeKeyword({ yoy_change: yoyChange })]}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
        />
      )

      expect(screen.getByText(expectedText)).toHaveClass(expectedClass)
    }
  )

  it('calls restore and delete callbacks with the selected keyword', async () => {
    const user = userEvent.setup()
    const keyword = makeKeyword()
    const onRestore = vi.fn()
    const onDelete = vi.fn()

    render(
      <KeywordSearchList
        keywords={[keyword]}
        onRestore={onRestore}
        onDelete={onDelete}
      />
    )

    await user.click(screen.getByRole('button', { name: '복원' }))
    await user.click(
      screen.getByRole('button', {
        name: '"artificial intelligence" 키워드 삭제',
      })
    )

    expect(onRestore).toHaveBeenCalledWith(keyword)
    expect(onDelete).toHaveBeenCalledWith('keyword-1')
  })
})
