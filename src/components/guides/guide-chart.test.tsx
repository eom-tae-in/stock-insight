import { cloneElement, isValidElement } from 'react'
import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { GuideChart } from './guide-chart'

// jsdom has no layout; supply a deterministic plotting viewport, not fake chart values.
vi.mock('recharts', async importOriginal => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { readonly children: ReactNode }) =>
      isValidElement<{ width: number; height: number }>(children)
        ? cloneElement(children, { width: 500, height: 260 })
        : null,
  }
})

it('selects an exact week and keeps chart keyboard events inside the chart', () => {
  const cardKeys = vi.fn()
  render(
    <div onKeyDown={cardKeys}>
      <GuideChart name="comparison" />
    </div>
  )
  const slider = screen.getByRole('slider')
  expect(slider).toHaveAttribute(
    'aria-valuetext',
    expect.stringContaining('$208.40')
  )
  fireEvent.change(slider, { target: { value: '0' } })
  expect(slider).toHaveAttribute(
    'aria-valuetext',
    expect.stringContaining('$190.80')
  )
  fireEvent.keyDown(slider, { key: 'ArrowLeft' })
  expect(cardKeys).not.toHaveBeenCalled()
  expect(screen.getByText(/설명용 정적 샘플/)).toBeVisible()
})
it('toggles independent series without allowing an empty plot and exposes exact table units', async () => {
  const user = userEvent.setup()
  render(<GuideChart name="metrics" />)
  const price = screen.getByRole('button', { name: /주간 종가/ })
  const average = screen.getByRole('button', { name: /13주 이동평균/ })
  await user.click(price)
  expect(price).toHaveAttribute('aria-pressed', 'false')
  expect(average).toBeDisabled()
  await user.click(price)
  expect(price).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByText('주간 수치를 표로 확인해요'))
  const table = screen.getByRole('table')
  expect(within(table).getByText('$208.40')).toBeVisible()
  expect(within(table).getAllByText('— (13주 미만)')).toHaveLength(12)
})
