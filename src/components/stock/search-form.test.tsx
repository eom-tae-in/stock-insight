import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchForm } from './search-form'

describe('SearchForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('uppercases the ticker and submits it', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<SearchForm onSubmit={onSubmit} />)

    const input = screen.getByPlaceholderText(
      '예: AAPL, TSLA, MSFT 또는 회사명...'
    )
    await user.type(input, 'aapl')
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(input).toHaveValue('AAPL')
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('AAPL'))
  })

  it('shows loading and external error states', () => {
    render(
      <SearchForm
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        isLoading
        error="조회 실패"
      />
    )

    expect(
      screen.getByPlaceholderText('예: AAPL, TSLA, MSFT 또는 회사명...')
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: '조회 중...' })).toBeDisabled()
    expect(screen.getByText('조회 실패')).toBeInTheDocument()
  })

  it('shows a local error when submit rejects', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('API 실패'))

    render(<SearchForm onSubmit={onSubmit} />)

    await user.type(
      screen.getByPlaceholderText('예: AAPL, TSLA, MSFT 또는 회사명...'),
      'msft'
    )
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(await screen.findByText('API 실패')).toBeInTheDocument()
  })

  it('shows validation feedback for an empty submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<SearchForm onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(
      await screen.findByText('종목 심볼 또는 회사명을 입력해주세요')
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders sorted suggestions and submits the selected suggestion', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { symbol: 'T', longname: 'AT&T Inc.' },
          { symbol: 'TSLA', longname: 'Tesla, Inc.' },
        ],
      }),
    } as Response)

    render(<SearchForm onSubmit={onSubmit} />)

    await user.type(
      screen.getByPlaceholderText('예: AAPL, TSLA, MSFT 또는 회사명...'),
      'tsla'
    )

    expect(await screen.findByText('Tesla, Inc.')).toBeInTheDocument()
    await user.click(screen.getByText('TSLA'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('TSLA'))
  })

  it('submits a highlighted suggestion with keyboard navigation', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { symbol: 'MS', longname: 'Morgan Stanley' },
          { symbol: 'MSFT', longname: 'Microsoft Corporation' },
        ],
      }),
    } as Response)

    render(<SearchForm onSubmit={onSubmit} />)

    await user.type(
      screen.getByPlaceholderText('예: AAPL, TSLA, MSFT 또는 회사명...'),
      'ms'
    )

    expect(await screen.findByText('Microsoft Corporation')).toBeInTheDocument()

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}{Enter}')

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('MS'))
  })

  it.each([
    {
      name: 'non-ok response',
      mockFetch: () =>
        vi.mocked(fetch).mockResolvedValue({
          ok: false,
        } as Response),
    },
    {
      name: 'rejected request',
      mockFetch: () => vi.mocked(fetch).mockRejectedValue(new Error('network')),
    },
  ])('hides suggestions for $name', async ({ mockFetch }) => {
    const user = userEvent.setup()
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    mockFetch()

    render(<SearchForm onSubmit={vi.fn().mockResolvedValue(undefined)} />)

    await user.type(
      screen.getByPlaceholderText('예: AAPL, TSLA, MSFT 또는 회사명...'),
      'meta'
    )

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByText('Meta Platforms')).not.toBeInTheDocument()

    consoleError.mockRestore()
  })
})
