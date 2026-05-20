import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { toast } from 'sonner'
import { SaveStockButton } from './save-stock-button'
import type { PriceDataPoint } from '@/types'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const priceData: PriceDataPoint[] = [
  {
    date: '2026-05-15',
    close: 100,
  },
]

function renderSaveStockButton() {
  return render(
    <SaveStockButton
      ticker="AAPL"
      companyName="Apple Inc."
      currency="USD"
      priceData={priceData}
    />
  )
}

describe('SaveStockButton', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    pushMock.mockReset()
    vi.mocked(toast.success).mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it('posts stock data and navigates to the saved analysis on success', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'search-1' } }),
    } as Response)

    renderSaveStockButton()
    await user.click(screen.getByRole('button', { name: /저장/ }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
          currency: 'USD',
          priceData,
        }),
      })
    })
    expect(toast.success).toHaveBeenCalledWith('종목이 저장되었습니다!')
    expect(pushMock).toHaveBeenCalledWith('/stock-analysis/search-1')
  })

  it('shows an API error message and keeps the user on the page', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: '이미 저장된 종목입니다' } }),
    } as Response)

    renderSaveStockButton()
    await user.click(screen.getByRole('button', { name: /저장/ }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('이미 저장된 종목입니다')
    })
    expect(pushMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /저장/ })).toBeEnabled()
  })

  it('shows a fallback error when the request fails', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockRejectedValue(new Error('network failed'))

    renderSaveStockButton()
    await user.click(screen.getByRole('button', { name: /저장/ }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('저장 중 오류가 발생했습니다')
    })
    expect(pushMock).not.toHaveBeenCalled()
  })
})
