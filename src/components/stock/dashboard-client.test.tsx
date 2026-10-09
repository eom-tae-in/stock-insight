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

    expect(screen.getByText('저장한 종목이 없어요.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ 추가' })).toHaveAttribute(
      'href',
      '/search'
    )
  })

  it('deletes selected records while preserving the saved order of remaining records', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)
    localStorage.setItem(
      'stock-sort-order',
      JSON.stringify({ 'search-3': 0, 'search-2': 1, 'search-1': 2 })
    )

    render(
      <DashboardClient
        initialRecords={[
          makeRecord(),
          makeRecord({
            id: 'search-2',
            ticker: 'MSFT',
            company_name: 'Microsoft Corporation',
          }),
          makeRecord({
            id: 'search-3',
            ticker: 'NVDA',
            company_name: 'Nvidia',
          }),
        ]}
      />
    )

    await user.click(screen.getByRole('button', { name: /편집/ }))
    await user.click(screen.getByRole('menuitem', { name: '삭제' }))
    await user.click(screen.getByRole('checkbox', { name: 'AAPL 선택' }))

    expect(screen.getByText('1개 선택됨')).toBeInTheDocument()

    const deleteButtons = screen.getAllByRole('button', { name: /삭제/ })
    await user.click(deleteButtons[deleteButtons.length - 1])

    expect(
      await screen.findByText('종목 1개를 삭제할까요?')
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
    expect(localStorage.getItem('stock-sort-order')).toBe(
      JSON.stringify({ 'search-3': 0, 'search-2': 1 })
    )
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
    await user.click(screen.getByRole('menuitem', { name: '순서 변경' }))
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

  it('전체 선택을 다시 누르거나 선택 해제하면 삭제 선택을 비운다', async () => {
    const user = userEvent.setup()
    render(<DashboardClient initialRecords={[makeRecord()]} />)
    await user.click(screen.getByRole('button', { name: '편집' }))
    await user.click(screen.getByRole('menuitem', { name: '삭제' }))
    const selectAll = screen.getByRole('checkbox', { name: '전체 선택' })
    await user.click(selectAll)
    expect(screen.getByRole('status')).toHaveTextContent('1개 선택됨')
    await user.click(selectAll)
    expect(screen.getByRole('status')).toHaveTextContent('0개 선택됨')
    expect(screen.getByRole('button', { name: '삭제' })).toBeDisabled()
    await user.click(selectAll)
    await user.click(screen.getByRole('button', { name: '선택 해제' }))
    expect(selectAll).not.toBeChecked()
  })

  it('삭제 확인을 취소하면 요청 없이 선택과 목록을 유지한다', async () => {
    const user = userEvent.setup()
    render(<DashboardClient initialRecords={[makeRecord()]} />)
    await user.click(screen.getByRole('button', { name: '편집' }))
    await user.click(screen.getByRole('menuitem', { name: '삭제' }))
    await user.click(screen.getByRole('checkbox', { name: '전체 선택' }))
    await user.click(screen.getByRole('button', { name: '삭제' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('선택한 AAPL을 관심 종목에서 삭제해요')
    await user.click(within(dialog).getByRole('button', { name: '취소' }))
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('1개 선택됨')
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('순서 변경을 취소하면 기존 저장 순서를 다시 표시한다', async () => {
    const user = userEvent.setup()
    const saved = JSON.stringify({ 'search-2': 0, 'search-1': 1 })
    localStorage.setItem('stock-sort-order', saved)
    render(
      <DashboardClient
        initialRecords={[
          makeRecord(),
          makeRecord({ id: 'search-2', ticker: 'MSFT' }),
        ]}
      />
    )
    await user.click(screen.getByRole('button', { name: '편집' }))
    await user.click(screen.getByRole('menuitem', { name: '순서 변경' }))
    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(localStorage.getItem('stock-sort-order')).toBe(saved)
    expect(
      screen.getAllByRole('heading', { level: 3 }).map(item => item.textContent)
    ).toEqual(['MSFT', 'AAPL'])
    expect(toastMock.success).not.toHaveBeenCalled()
  })

  it('shows an error toast when selected deletion fails', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<DashboardClient initialRecords={[makeRecord()]} />)

    await user.click(screen.getByRole('button', { name: /편집/ }))
    await user.click(screen.getByRole('menuitem', { name: '삭제' }))
    await user.click(screen.getByRole('checkbox', { name: '전체 선택' }))
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
