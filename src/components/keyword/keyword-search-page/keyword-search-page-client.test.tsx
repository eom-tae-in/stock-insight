import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import KeywordSearchPageClient from '@/components/keyword/keyword-search-page/keyword-search-page-client'

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}))

const searchParamsMock = vi.hoisted(() => ({
  params: new URLSearchParams(),
}))

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  useSearchParams: () => searchParamsMock.params,
}))

vi.mock('sonner', () => ({
  toast: toastMock,
}))

describe('KeywordSearchPageClient integration', () => {
  beforeEach(() => {
    routerMock.push.mockReset()
    toastMock.error.mockReset()
    searchParamsMock.params = new URLSearchParams()
  })

  it('prefills the keyword from URL params and navigates with normalized query values', async () => {
    const user = userEvent.setup()
    searchParamsMock.params = new URLSearchParams({
      keyword: 'artificial%20   intelligence',
    })

    render(<KeywordSearchPageClient />)

    const input = screen.getByPlaceholderText(
      '예: artificial intelligence, 전기차'
    )
    await waitFor(() => expect(input).toHaveValue('artificial    intelligence'))

    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(routerMock.push).toHaveBeenCalledWith(
      '/keyword-analysis/search?keyword=artificial%20intelligence&geo=GLOBAL&timeframe=5Y&gprop=WEB'
    )
  })

  it('shows a toast instead of navigating for a blank keyword', async () => {
    const user = userEvent.setup()

    render(<KeywordSearchPageClient />)

    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(toastMock.error).toHaveBeenCalledWith('키워드를 입력해주세요')
    expect(routerMock.push).not.toHaveBeenCalled()
  })
})
