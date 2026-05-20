import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import KeywordSearchForm from './keyword-search-form'

function renderForm(overrides = {}) {
  const props = {
    keyword: '',
    geo: 'GLOBAL',
    gprop: 'WEB',
    isLoading: false,
    onKeywordChange: vi.fn(),
    onGeoChange: vi.fn(),
    onGpropChange: vi.fn(),
    onSearch: vi.fn(),
    ...overrides,
  }

  render(<KeywordSearchForm {...props} />)

  return props
}

describe('KeywordSearchForm', () => {
  it('calls keyword change callback as the user types', async () => {
    const user = userEvent.setup()
    const props = renderForm()

    await user.type(
      screen.getByPlaceholderText('예: artificial intelligence, 전기차'),
      'ai'
    )

    expect(props.onKeywordChange).toHaveBeenCalledWith('a')
    expect(props.onKeywordChange).toHaveBeenCalledWith('i')
  })

  it.each([{ action: 'click' }, { action: 'enter' }])(
    'calls search callback on $action',
    async ({ action }) => {
      const user = userEvent.setup()
      const props = renderForm({ keyword: 'ai' })

      if (action === 'click') {
        await user.click(screen.getByRole('button', { name: '조회' }))
      } else {
        await user.click(
          screen.getByPlaceholderText('예: artificial intelligence, 전기차')
        )
        await user.keyboard('{Enter}')
      }

      expect(props.onSearch).toHaveBeenCalledTimes(1)
    }
  )

  it('disables search controls while loading', () => {
    renderForm({ isLoading: true })

    expect(
      screen.getByPlaceholderText('예: artificial intelligence, 전기차')
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: '로딩중...' })).toBeDisabled()
  })
})
