import { describe, expect, it } from 'vitest'

import {
  calculateMA13,
  calculateTrendsMA13,
  calculateTrendsYoY,
} from './indicators'
import type { PriceDataPoint, TrendsDataPoint } from '@/types'

function price(close: number, index: number): PriceDataPoint {
  return {
    date: `2024-01-${String(index + 1).padStart(2, '0')}`,
    close,
  }
}

function trend(value: number, index: number): TrendsDataPoint {
  return {
    date: `2024-01-${String(index + 1).padStart(2, '0')}`,
    value,
    ma13Value: null,
    yoyValue: null,
  }
}

describe('calculateMA13', () => {
  it('returns null until 13 price points are available', () => {
    const result = calculateMA13(
      Array.from({ length: 12 }, (_, i) => price(10, i))
    )

    expect(result).toEqual(Array.from({ length: 12 }, () => null))
  })

  it('calculates a rounded 13-week moving average', () => {
    const result = calculateMA13(
      Array.from({ length: 13 }, (_, i) => price(i + 1, i))
    )

    expect(result.at(-1)).toBe(7)
  })
})

describe('calculateTrendsMA13', () => {
  it('calculates a rounded 13-week moving average for trend values', () => {
    const result = calculateTrendsMA13(
      Array.from({ length: 13 }, (_, i) => trend(i + 1, i))
    )

    expect(result.at(-1)).toBe(7)
  })
})

describe('calculateTrendsYoY', () => {
  describe('boundary input', () => {
    it('returns null when fewer than 65 weeks are available', () => {
      const result = calculateTrendsYoY(
        Array.from({ length: 64 }, (_, i) => trend(10, i))
      )

      expect(result).toBeNull()
    })

    it.each([
      ['current MA13 is null', 12, 10, 64, null],
      ['52-week prior MA13 is null', 12, null, 64, 20],
      ['52-week prior MA13 is zero', 12, 0, 64, 20],
    ])(
      'returns null when %s',
      (_caseName, pastIndex, pastValue, currentIndex, currentValue) => {
        const precomputedMA13: (number | null)[] = Array.from(
          { length: 65 },
          () => 10
        )
        precomputedMA13[pastIndex] = pastValue
        precomputedMA13[currentIndex] = currentValue

        expect(calculateTrendsYoY([], precomputedMA13)).toBeNull()
      }
    )
  })

  describe('valid input', () => {
    it('compares the latest MA13 with the MA13 from 52 weeks earlier', () => {
      const data = [
        ...Array.from({ length: 13 }, (_, i) => trend(10, i)),
        ...Array.from({ length: 39 }, (_, i) => trend(15, i + 13)),
        ...Array.from({ length: 13 }, (_, i) => trend(20, i + 52)),
      ]

      expect(calculateTrendsYoY(data)).toBe(100)
    })
  })
})
