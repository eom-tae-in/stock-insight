import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuideReader } from './guide-reader'
import { guideStep } from '@/lib/guides/navigation'

vi.mock('./guide-chart', () => ({ GuideChart: () => null }))

beforeEach(() =>
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
)
it.each([
  undefined,
  ['2', '3'],
  '-1',
  '0',
  '8',
  '1.5',
  'Infinity',
  '2e0',
  '02',
  '<script>',
])('starts at the intro for invalid step %s', step =>
  expect(guideStep(step, 7)).toBe(1)
)

describe('guide navigation', () => {
  it('changes cards immediately without changing URL or history', async () => {
    const user = userEvent.setup()
    render(<GuideReader journey="current" step="5" />)
    const url = location.href
    const historyLength = history.length
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '내 차트를 만들고 자료를 남기기'
    )
    await user.click(screen.getByRole('button', { name: '이전' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '비교해 보고, 남기고 싶을 때 저장'
    )
    expect(location.href).toBe(url)
    expect(history.length).toBe(historyLength)
    expect(
      screen.queryByRole('button', { name: '커스텀 차트 저장' })
    ).not.toBeInTheDocument()
  })
  it('supports arrow keys and prevents moving before the first card', () => {
    render(<GuideReader journey="current" step={undefined} />)
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled()
    fireEvent.keyDown(screen.getByRole('main'), { key: 'ArrowLeft' })
    fireEvent.keyDown(screen.getByRole('main'), { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '관심 종목부터 하나 저장해 보세요'
    )
  })
  it('opens contents, jumps to a card and switches journeys without navigating', async () => {
    const user = userEvent.setup()
    render(<GuideReader journey="current" step="1" />)
    await user.click(screen.getByRole('button', { name: /목차 열기/ }))
    await user.click(screen.getByRole('button', { name: /함께 비교/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '비교해 보고, 남기고 싶을 때 저장'
    )
    await user.click(
      screen.getByRole('button', { name: '새로워질 모습을 살펴봐요' })
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '기능보다, 사용자의 질문에서 시작'
    )
  })
  it('opens contents at the last card instead of navigating away', async () => {
    const user = userEvent.setup()
    render(<GuideReader journey="renewal" step="6" />)
    expect(
      screen.getByText(/자동 갱신·주간 메일·관계 탐색은 후속 구상/)
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: '목차' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '궁금한 내용을 골라봐요'
    )
  })
})
