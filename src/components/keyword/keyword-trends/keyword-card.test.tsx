import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { KeywordCard } from './keyword-card'
import type { KeywordRecord } from '@/types/database'

const keyword: KeywordRecord = {
  id: 'keyword-1',
  user_id: 'user-1',
  keyword: 'AI stocks',
  region: 'GLOBAL',
  search_type: 'WEB',
  trends_data: [],
  searched_at: '2026-05-15T00:00:00Z',
  created_at: '2026-05-15T00:00:00Z',
  updated_at: '2026-05-15T00:00:00Z',
}

describe('KeywordCard', () => {
  it('renders a normal keyword card that links to keyword detail', () => {
    render(
      <KeywordCard
        keyword={keyword}
        isManageMode={false}
        isSelected={false}
        isEditing={false}
      />
    )

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/keywords/keyword-1'
    )
    expect(screen.getByText('AI stocks')).toBeInTheDocument()
  })

  it('toggles selection in delete mode when the card is clicked', async () => {
    const user = userEvent.setup()
    const onToggleSelect = vi.fn()
    render(
      <KeywordCard
        keyword={keyword}
        isManageMode
        mode="delete"
        isSelected={false}
        isEditing={false}
        onToggleSelect={onToggleSelect}
      />
    )

    await user.click(screen.getByText('AI stocks'))

    expect(onToggleSelect).toHaveBeenCalledWith('keyword-1')
  })

  it('starts editing from the edit button in delete mode', async () => {
    const user = userEvent.setup()
    const onEditStart = vi.fn()
    render(
      <KeywordCard
        keyword={keyword}
        isManageMode
        mode="delete"
        isSelected={false}
        isEditing={false}
        onEditStart={onEditStart}
      />
    )

    await user.click(screen.getByRole('button', { name: '키워드 수정' }))

    expect(onEditStart).toHaveBeenCalledWith('keyword-1')
  })

  it('saves a changed keyword in editing mode', async () => {
    const user = userEvent.setup()
    const onEditSave = vi.fn().mockResolvedValue(undefined)
    render(
      <KeywordCard
        keyword={keyword}
        isManageMode
        isSelected={false}
        isEditing
        onEditSave={onEditSave}
      />
    )

    const input = screen.getByPlaceholderText('키워드 입력')
    await user.clear(input)
    await user.type(input, 'AI chip')
    await user.click(screen.getByRole('button', { name: /저장/ }))

    await waitFor(() => {
      expect(onEditSave).toHaveBeenCalledWith('keyword-1', 'AI chip')
    })
  })

  it('cancels editing when the value is unchanged', async () => {
    const user = userEvent.setup()
    const onEditCancel = vi.fn()
    const onEditSave = vi.fn()
    render(
      <KeywordCard
        keyword={keyword}
        isManageMode
        isSelected={false}
        isEditing
        onEditSave={onEditSave}
        onEditCancel={onEditCancel}
      />
    )

    await user.click(screen.getByRole('button', { name: /저장/ }))

    expect(onEditCancel).toHaveBeenCalled()
    expect(onEditSave).not.toHaveBeenCalled()
  })
})
