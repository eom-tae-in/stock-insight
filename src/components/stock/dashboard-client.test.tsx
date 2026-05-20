import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardClient } from '@/components/stock/dashboard-client'
import type { SearchRecord } from '@/types'

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: toastMock,
}))

function makeRecord(overrides: Partial<SearchRecord> = {}): SearchRecord {
  return {
    id: 'search-1',
    user_id: 'user-1',
    ticker: 'AAPL',
    company_name: 'Apple Inc.',
    currency: 'USD',
    weekly_open: 100,
    weekly_high: 130,
    weekly_low: 90,
    current_price: 120,
    previous_close: 110,
    ma13: 112,
    yoy_change: 12.5,
    price_data: [],
    trends_data: [],
    searched_at: '2026-05-18T00:00:00.000Z',
    last_updated_at: '2026-05-18T00:00:00.000Z',
    ...overrides,
  }
}

describe('DashboardClient integration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
    toastMock.success.mockReset()
    toastMock.error.mockReset()
  })

  it('renders the empty dashboard state', () => {
    render(<DashboardClient initialRecords={[]} />)

    expect(screen.getByText('내 종목이 없습니다.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ 추가' })).toHaveAttribute(
      'href',
      '/search'
    )
  })

  it('deletes selected records through edit mode and confirmation dialog', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)

    render(
      <DashboardClient
        initialRecords={[
          makeRecord(),
          makeRecord({
            id: 'search-2',
            ticker: 'MSFT',
            company_name: 'Microsoft Corporation',
          }),
        ]}
      />
    )

    await user.click(screen.getByRole('button', { name: /편집/ }))
    await user.click(screen.getByRole('button', { name: /삭제/ }))
    await user.click(screen.getByRole('checkbox', { name: 'AAPL 선택' }))

    expect(screen.getByText('1개 선택됨')).toBeInTheDocument()

    const deleteButtons = screen.getAllByRole('button', { name: /삭제/ })
    await user.click(deleteButtons[deleteButtons.length - 1])

    expect(
      await screen.findByText(/선택된 1개의 종목을 삭제하시겠습니까/)
    ).toBeInTheDocument()

    const dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: '삭제' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/api/searches/search-1', {
        method: 'DELETE',
      })
    )
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
    expect(toastMock.success).toHaveBeenCalledWith('1개 종목이 삭제되었습니다.')
  })

  it('persists stock reorder mode to localStorage when edit is completed', async () => {
    const user = userEvent.setup()

    render(
      <DashboardClient
        initialRecords={[
          makeRecord(),
          makeRecord({
            id: 'search-2',
            ticker: 'MSFT',
            company_name: 'Microsoft Corporation',
          }),
        ]}
      />
    )

    await user.click(screen.getByRole('button', { name: /편집/ }))
    await user.click(screen.getByRole('button', { name: /순서 변경/ }))
    await user.click(screen.getByRole('button', { name: /완료/ }))

    expect(localStorage.getItem('stock-sort-order')).toBe(
      JSON.stringify({
        'search-1': 0,
        'search-2': 1,
      })
    )
    expect(toastMock.success).toHaveBeenCalledWith(
      '종목 위치가 저장되었습니다.'
    )
  })

  it('shows an error toast when selected deletion fails', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<DashboardClient initialRecords={[makeRecord()]} />)

    await user.click(screen.getByRole('button', { name: /편집/ }))
    await user.click(screen.getByRole('button', { name: /삭제/ }))
    await user.click(screen.getByRole('button', { name: '전체 선택' }))
    await user.click(screen.getAllByRole('button', { name: /삭제/ }).at(-1)!)
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: '삭제',
      })
    )

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith('삭제에 실패했습니다.')
    )
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })
})
