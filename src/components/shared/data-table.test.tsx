import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataTable } from './data-table'
import type { PriceDataPoint } from '@/types'

class IntersectionObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()
}

function makePriceData(count: number): PriceDataPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    date: `2025-${String(Math.floor(index / 4) + 1).padStart(2, '0')}-${String(
      (index % 4) + 1
    ).padStart(2, '0')}`,
    close: 100 + index,
  }))
}

describe('DataTable', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders price rows, summary count, and default date descending status', () => {
    const priceData = makePriceData(3)

    render(
      <DataTable
        ticker="AAPL"
        priceData={priceData}
        ma13Values={[null, 101, 102]}
      />
    )

    expect(
      screen.getByText('현재 일정 기준 내림차순으로 정렬되어 있습니다')
    ).toBeInTheDocument()
    expect(screen.getByText('총 3개 항목')).toBeInTheDocument()
    expect(screen.getByText('2025-01-03')).toBeInTheDocument()
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0)
  })

  it('sorts rows when a sortable header is clicked', async () => {
    const user = userEvent.setup()
    const priceData = makePriceData(3)

    render(
      <DataTable
        ticker="AAPL"
        priceData={priceData}
        ma13Values={[100, 101, 102]}
      />
    )

    await user.click(screen.getByRole('button', { name: /주가/ }))

    expect(
      screen.getByText('현재 주가 기준 오름차순으로 정렬되어 있습니다')
    ).toBeInTheDocument()
  })

  it('shows and handles the scroll-to-top button after scrolling', () => {
    const priceData = makePriceData(3)

    render(
      <DataTable
        ticker="AAPL"
        priceData={priceData}
        ma13Values={[100, 101, 102]}
      />
    )

    Object.defineProperty(window, 'scrollY', { value: 400, configurable: true })
    fireEvent.scroll(window)
    fireEvent.click(screen.getByRole('button', { name: '맨 위로 이동' }))

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
