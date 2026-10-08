import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '@/components/ui/button'
import { ChangeBadge, ChangeText } from './change-badge'
import { Segmented } from './segmented'
import { SeriesToggle } from './series-toggle'
import { TextField } from './text-field'
import { Sparkline } from './sparkline'

describe('공통 컴포넌트 상태', () => {
  it.each([
    [2.35, '+2.35%', 'text-up'],
    [-1.82, '−1.82%', 'text-down'],
    [0, '+0.00%', 'text-text-secondary'],
    [null, '—', 'text-text-secondary'],
  ] as const)(
    '등락 %s에 부호와 의미 색을 함께 표시한다',
    (value, expected, color) => {
      // Given
      render(<ChangeBadge value={value} />)
      // When
      const output = screen.getByText(expected)
      // Then
      expect(output).toHaveClass(color)
    }
  )
  it('Plain 등락은 Soft 배경을 사용하지 않는다', () => {
    render(<ChangeText value={2.35} />)
    const output = screen.getByText('+2.35%')
    expect(output).not.toHaveClass('bg-up-subtle')
  })
  it('비활성 버튼은 클릭하지 못한다', async () => {
    const click = vi.fn()
    render(
      <Button disabled onClick={click}>
        실행
      </Button>
    )
    await userEvent.click(screen.getByRole('button'))
    expect(click).not.toHaveBeenCalled()
  })
  it('키보드 포커스와 활성화는 실제 버튼에 전달된다', async () => {
    const click = vi.fn()
    render(
      <Button variant="secondary" onClick={click}>
        실행
      </Button>
    )
    await userEvent.tab()
    const button = screen.getByRole('button')
    expect(button).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(click).toHaveBeenCalledOnce()
  })
  it('입력 오류는 연결된 설명과 alert로 제공된다', () => {
    render(<TextField label="이메일" error="입력을 확인하세요." />)
    const input = screen.getByRole('textbox', { name: '이메일' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('입력을 확인하세요.')
    expect(screen.getByRole('alert')).toBeVisible()
  })
  it('세그먼트 키보드 선택은 비활성 항목을 건너뛴다', async () => {
    function Fixture() {
      const [value, setValue] = useState('a')
      return (
        <Segmented
          label="기간"
          value={value}
          onValueChange={setValue}
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B', disabled: true },
            { value: 'c', label: 'C' },
          ]}
        />
      )
    }
    render(<Fixture />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowRight>}')
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'C' })).toBeChecked()
    )
    await userEvent.keyboard('{/ArrowRight}')
  })
  it('시리즈 토글의 비활성 상태는 변경 콜백을 막는다', async () => {
    const changed = vi.fn()
    render(
      <SeriesToggle tone="price" selected disabled onSelectedChange={changed}>
        주가
      </SeriesToggle>
    )
    await userEvent.click(screen.getByRole('button'))
    expect(changed).not.toHaveBeenCalled()
  })
  it('결측 스파크라인은 양쪽 구간을 따로 렌더한다', () => {
    render(<Sparkline values={[1, 2, null, 3, 4]} label="주가" />)
    const chart = screen.getByRole('img', { name: '주가' })
    expect(chart.querySelectorAll('g')).toHaveLength(2)
  })
  it('유효 점이 부족한 스파크라인은 선을 만들지 않는다', () => {
    render(<Sparkline values={[null, 1]} label="주가" />)
    expect(
      screen.getByRole('img', { name: '주가: 데이터 부족' })
    ).toHaveTextContent('—')
  })
})
