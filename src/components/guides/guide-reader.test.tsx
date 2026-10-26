import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GuideReader } from './guide-reader'
import { guideStep } from '@/lib/guides/navigation'

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
])('starts at the intro for invalid step %s', step => {
  expect(guideStep(step, 7)).toBe(1)
})

describe('guide navigation', () => {
  it('restores the comparison card from its URL step, with meaningful previous and next links', () => {
    render(<GuideReader journey="current" step="5" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '비교해 보고, 남기고 싶을 때 저장'
    )
    expect(screen.getByRole('link', { name: '이전' })).toHaveAttribute(
      'href',
      '/guide?step=4#guide-title'
    )
    expect(screen.getByRole('link', { name: '다음' })).toHaveAttribute(
      'href',
      '/guide?step=6#guide-title'
    )
    expect(
      screen.queryByRole('button', { name: '커스텀 차트 저장' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(
        '종목 추가만으로 저장되지는 않아요. 저장한 비교는 현재 분석 조건에만 속해요.'
      )
    ).toBeVisible()
  })
  it('disables previous at the start', () => {
    render(<GuideReader journey="current" step={undefined} />)
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled()
  })
  it('returns to the index at the end and distinguishes plans from available features', () => {
    render(<GuideReader journey="renewal" step="6" />)
    expect(screen.getByRole('link', { name: '목차' })).toHaveAttribute(
      'href',
      '/explore'
    )
    expect(screen.queryByRole('link', { name: '다음' })).not.toBeInTheDocument()
    expect(
      screen.getByText(/자동 갱신·주간 메일·관계 탐색은 후속 구상/)
    ).toBeVisible()
  })
})
