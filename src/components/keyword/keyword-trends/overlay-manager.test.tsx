import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OverlayManager from './overlay-manager'
import type { SearchRecord } from '@/types/database'

function searchRecord(overrides: Partial<SearchRecord> = {}): SearchRecord {
  return {
    id: 'search-1',
    user_id: 'user-1',
    ticker: 'AAPL',
    company_name: 'Apple Inc.',
    price_data: [],
    searched_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderOverlayManager(overrides = {}) {
  const props = {
    selectedSearches: [],
    availableSearches: [searchRecord()],
    searchFilter: '',
    onAddOverlay: vi.fn(),
    onRemoveOverlay: vi.fn(),
    onSearchFilterChange: vi.fn(),
    onAddTickerOverlay: vi.fn(),
    ...overrides,
  }

  render(<OverlayManager {...props} />)

  return props
}

describe('OverlayManager', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('disables search when an overlay is already selected and removes selected overlays', async () => {
    const user = userEvent.setup()
    const selected = searchRecord()
    const props = renderOverlayManager({
      selectedSearches: [selected],
    })

    expect(
      screen.getByPlaceholderText('종목 검색 (Ticker 또는 회사명)')
    ).toBeDisabled()
    expect(screen.getByText('1. AAPL - Apple Inc.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'AAPL 오버레이 제거' }))

    expect(props.onRemoveOverlay).toHaveBeenCalledWith('search-1')
  })

  it('searches ticker suggestions and adds an existing saved search', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ symbol: 'AAPL', longname: 'Apple Inc.' }],
      }),
    } as Response)
    const props = renderOverlayManager()

    await user.type(
      screen.getByPlaceholderText('종목 검색 (Ticker 또는 회사명)'),
      'aapl'
    )

    expect(await screen.findByText('Apple Inc.')).toBeInTheDocument()
    await user.click(screen.getByText('AAPL'))

    await waitFor(() =>
      expect(props.onAddOverlay).toHaveBeenCalledWith('search-1')
    )
    expect(props.onSearchFilterChange).toHaveBeenLastCalledWith('')
  })

  it('adds a new ticker overlay when suggestion is not saved', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ symbol: 'MSFT', longname: 'Microsoft Corporation' }],
      }),
    } as Response)
    const props = renderOverlayManager()

    await user.type(
      screen.getByPlaceholderText('종목 검색 (Ticker 또는 회사명)'),
      'msft'
    )

    expect(await screen.findByText('Microsoft Corporation')).toBeInTheDocument()
    await user.click(screen.getByText('MSFT'))

    await waitFor(() =>
      expect(props.onAddTickerOverlay).toHaveBeenCalledWith(
        'MSFT',
        'Microsoft Corporation'
      )
    )
  })

  it('supports keyboard suggestion selection and Escape closing', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ symbol: 'TSLA', longname: 'Tesla, Inc.' }],
      }),
    } as Response)
    const props = renderOverlayManager({
      availableSearches: [searchRecord({ id: 'search-2', ticker: 'TSLA' })],
    })

    await user.type(
      screen.getByPlaceholderText('종목 검색 (Ticker 또는 회사명)'),
      'tsla'
    )
    expect(await screen.findByText('Tesla, Inc.')).toBeInTheDocument()

    await user.keyboard('{ArrowDown}{Enter}')

    expect(props.onAddOverlay).toHaveBeenCalledWith('search-2')
  })
})
