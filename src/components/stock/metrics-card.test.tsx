import { render, screen } from '@testing-library/react'
import { TrendingUp } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { MetricsCard } from './metrics-card'

describe('MetricsCard', () => {
  it('renders label, unit, and formatted numeric value', () => {
    render(<MetricsCard label="현재가" value={123.456} unit="$" />)

    expect(screen.getByText('현재가')).toBeInTheDocument()
    expect(screen.getByText('$')).toBeInTheDocument()
    expect(screen.getByText('123.46')).toBeInTheDocument()
  })

  it('renders string values without numeric formatting', () => {
    render(<MetricsCard label="상태" value="데이터 없음" />)

    expect(screen.getByText('상태')).toBeInTheDocument()
    expect(screen.getByText('데이터 없음')).toBeInTheDocument()
  })

  it.each([
    ['positive', true, 'text-green-600'],
    ['negative', false, 'text-red-600'],
  ])(
    'applies %s color class when isPositive is %s',
    (_caseName, isPositive, expectedClass) => {
      render(<MetricsCard label="YoY" value={10} isPositive={isPositive} />)

      expect(screen.getByText('10.00')).toHaveClass(expectedClass)
    }
  )

  it('renders an optional icon', () => {
    render(
      <MetricsCard
        label="추세"
        value={1}
        icon={<TrendingUp aria-label="상승 아이콘" />}
      />
    )

    expect(screen.getByLabelText('상승 아이콘')).toBeInTheDocument()
  })
})
