import { describe, expect, it } from 'vitest'
import { cn, normalizeToTrendsRange } from './utils'
import type { PriceDataPoint } from '@/types'

function pricePoint(close: number): PriceDataPoint {
  return {
    date: '2026-01-01',
    close,
  }
}

describe('cn', () => {
  it('merges conditional class names and resolves Tailwind conflicts', () => {
    expect(cn('px-2', false && 'hidden', 'px-4')).toBe('px-4')
  })
})

describe('normalizeToTrendsRange', () => {
  it('returns an empty array for empty price data', () => {
    expect(normalizeToTrendsRange([])).toEqual([])
  })

  it('returns the midpoint when all close values are equal', () => {
    expect(
      normalizeToTrendsRange([
        pricePoint(120),
        pricePoint(120),
        pricePoint(120),
      ])
    ).toEqual([50, 50, 50])
  })

  it.each([
    {
      closes: [10, 20, 30],
      expected: [0, 50, 100],
    },
    {
      closes: [100, 125, 175],
      expected: [0, 33.33, 100],
    },
    {
      closes: [-10, 0, 30],
      expected: [0, 25, 100],
    },
  ])('normalizes close values to a 0-100 range', ({ closes, expected }) => {
    expect(normalizeToTrendsRange(closes.map(pricePoint))).toEqual(expected)
  })
})
