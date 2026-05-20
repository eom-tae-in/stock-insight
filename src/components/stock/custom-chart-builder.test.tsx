import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CustomChartBuilder } from './custom-chart-builder'

describe('CustomChartBuilder', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('crypto', {
      randomUUID: () => 'chart-uuid',
    })
  })

  it('opens the dialog and creates a custom chart in localStorage', async () => {
    const user = userEvent.setup()
    const onChartCreated = vi.fn()
    const dispatchEvent = vi.spyOn(window, 'dispatchEvent')

    render(
      <CustomChartBuilder searchId="search-1" onChartCreated={onChartCreated} />
    )

    await user.click(screen.getByRole('button', { name: /커스텀 차트 만들기/ }))
    await user.type(
      screen.getByPlaceholderText('예: 최근 1년 가격 추이'),
      '내 차트'
    )
    await user.click(screen.getByRole('button', { name: '차트 생성' }))

    await waitFor(() => expect(onChartCreated).toHaveBeenCalled())
    expect(
      JSON.parse(localStorage.getItem('stock-custom-charts-search-1') ?? '[]')
    ).toEqual([
      expect.objectContaining({
        id: 'chart-uuid',
        name: '내 차트',
        series: ['close'],
        timeRange: 52,
      }),
    ])
    expect(dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent))
  })

  it('requires a chart name before saving', async () => {
    const user = userEvent.setup()

    render(<CustomChartBuilder searchId="search-1" />)

    await user.click(screen.getByRole('button', { name: /커스텀 차트 만들기/ }))

    expect(screen.getByRole('button', { name: '차트 생성' })).toBeDisabled()
  })

  it('bumps the time range when a selected series requires more weeks', async () => {
    const user = userEvent.setup()
    const onChartCreated = vi.fn()

    render(
      <CustomChartBuilder searchId="search-1" onChartCreated={onChartCreated} />
    )

    await user.click(screen.getByRole('button', { name: /커스텀 차트 만들기/ }))
    await user.type(
      screen.getByPlaceholderText('예: 최근 1년 가격 추이'),
      'YoY 차트'
    )
    await user.click(screen.getByRole('button', { name: /13주 이동평균 기준/ }))
    await user.click(screen.getByRole('button', { name: '차트 생성' }))

    await waitFor(() =>
      expect(onChartCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          series: ['close', 'yoy'],
          timeRange: 65,
        })
      )
    )
  })
})
