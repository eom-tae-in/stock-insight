import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LoadingSkeleton } from './loading-skeleton'

describe('LoadingSkeleton', () => {
  it('renders the expected skeleton placeholders for the stock detail layout', () => {
    const { container } = render(<LoadingSkeleton />)

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
      21
    )
  })
})
