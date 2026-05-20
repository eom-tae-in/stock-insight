import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from './button'

describe('Button', () => {
  it('renders a native button by default', () => {
    render(<Button>저장</Button>)

    expect(screen.getByRole('button', { name: '저장' })).toHaveAttribute(
      'data-slot',
      'button'
    )
  })

  it('renders the child element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/stock-analysis">종목 분석</a>
      </Button>
    )

    expect(screen.getByRole('link', { name: '종목 분석' })).toHaveAttribute(
      'href',
      '/stock-analysis'
    )
  })
})
