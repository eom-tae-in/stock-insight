import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CustomChartBuilder } from './custom-chart-builder'
import { renderToString } from 'react-dom/server'

describe('CustomChartBuilder', () => {
  it('서버 첫 렌더에서는 동일한 비활성 버튼만 그리고 Radix ID를 만들지 않는다', () => {
    const markup = renderToString(<CustomChartBuilder searchId="search-1" />)
    expect(markup).toContain('disabled=""')
    expect(markup).toContain('커스텀 차트 만들기')
    expect(markup).not.toContain('aria-controls')
  })
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
    await user.click(screen.getByRole('button', { name: '차트 만들기' }))

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

    expect(screen.getByRole('button', { name: '차트 만들기' })).toBeDisabled()
  })

  it('주 수를 정수로 제한하고 시리즈가 없으면 저장을 막는다', async () => {
    const user = userEvent.setup()
    render(<CustomChartBuilder searchId="search-1" />)
    await user.click(screen.getByRole('button', { name: /커스텀 차트 만들기/ }))
    await user.type(screen.getByLabelText('차트 이름'), '직접 기간')
    fireEvent.change(screen.getByRole('spinbutton', { name: '주 수' }), {
      target: { value: '65.5' },
    })
    expect(screen.getByRole('spinbutton', { name: '주 수' })).toHaveValue(65)
    await user.click(screen.getByRole('checkbox', { name: '종가' }))
    expect(screen.getByRole('button', { name: '차트 만들기' })).toBeDisabled()
  })

  it('최소 기간을 충족하지 않는 시리즈는 기간을 늘리지 않고 비활성화한다', async () => {
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
    expect(screen.getByRole('checkbox', { name: '52주 YoY' })).toBeDisabled()
    expect(screen.getByRole('spinbutton', { name: '주 수' })).toHaveValue(52)
    await user.click(screen.getByRole('button', { name: '차트 만들기' }))

    await waitFor(() =>
      expect(onChartCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          series: ['close'],
          timeRange: 52,
        })
      )
    )
  })

  it('기간 축소로 YoY를 해제하고 이유를 표시하며 남은 시리즈로 저장한다', async () => {
    const user = userEvent.setup()
    const onChartCreated = vi.fn()
    render(
      <CustomChartBuilder searchId="search-1" onChartCreated={onChartCreated} />
    )
    await user.click(screen.getByRole('button', { name: /커스텀 차트 만들기/ }))
    await user.type(screen.getByLabelText('차트 이름'), '기간 변경')
    await user.click(screen.getByRole('radio', { name: '2년' }))
    await user.click(screen.getByRole('checkbox', { name: '52주 YoY' }))
    expect(screen.getByRole('checkbox', { name: '52주 YoY' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: '1년' }))
    expect(screen.getByRole('checkbox', { name: '52주 YoY' })).not.toBeChecked()
    expect(screen.getByRole('status')).toHaveTextContent(
      '기간이 줄어 선택을 해제했어요'
    )
    await user.click(screen.getByRole('button', { name: '차트 만들기' }))
    expect(onChartCreated).toHaveBeenCalledWith(
      expect.objectContaining({ series: ['close'], timeRange: 52 })
    )
  })

  it('저장 실패 시 필드 오류를 표시하고 기존 데이터를 보존한다', async () => {
    const user = userEvent.setup()
    localStorage.setItem('stock-custom-charts-search-1', 'invalid-json')
    render(<CustomChartBuilder searchId="search-1" />)
    await user.click(screen.getByRole('button', { name: /커스텀 차트 만들기/ }))
    await user.type(screen.getByLabelText('차트 이름'), '새 차트')
    await user.click(screen.getByRole('button', { name: '차트 만들기' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      '차트를 저장하지 못했어요'
    )
    expect(localStorage.getItem('stock-custom-charts-search-1')).toBe(
      'invalid-json'
    )
  })
})
