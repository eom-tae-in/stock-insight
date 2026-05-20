import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Container } from './container'

describe('Container', () => {
  it.each([
    { size: 'sm' as const, className: 'max-w-3xl' },
    { size: 'md' as const, className: 'max-w-5xl' },
    { size: 'lg' as const, className: 'max-w-7xl' },
    { size: 'xl' as const, className: 'max-w-[1400px]' },
    { size: 'full' as const, className: 'max-w-full' },
  ])('applies the $size width class', ({ size, className }) => {
    render(
      <Container size={size} className="custom-class">
        <span>content</span>
      </Container>
    )

    const container = screen.getByText('content').parentElement
    expect(container).toHaveClass(className)
    expect(container).toHaveClass('custom-class')
  })
})
