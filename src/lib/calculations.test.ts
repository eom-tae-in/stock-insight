import { describe, expect, it } from 'vitest'

import {
  calculateMetrics,
  calculateWeeklyYoY,
  calculateYoY,
  getWeeklyOHLC,
} from './calculations'
import type { PriceDataPoint } from '@/types'

function price(close: number, index: number): PriceDataPoint {
  return {
    date: `2024-01-${String(index + 1).padStart(2, '0')}`,
    close,
    open: close - 1,
    high: close + 1,
    low: close - 2,
  }
}

describe('calculateYoY', () => {
  describe('boundary input', () => {
    it('returns 0 for empty data', () => {
      expect(calculateYoY([])).toBe(0)
    })

    it('returns 0 when 52-week prior MA13 is not available', () => {
      const data = Array.from({ length: 64 }, (_, i) => price(10, i))

      expect(calculateYoY(data)).toBe(0)
    })

    it('returns 0 when 52-week prior MA13 is zero', () => {
      const data = [
        ...Array.from({ length: 13 }, (_, i) => price(0, i)),
        ...Array.from({ length: 39 }, (_, i) => price(10, i + 13)),
        ...Array.from({ length: 13 }, (_, i) => price(20, i + 52)),
      ]

      expect(calculateYoY(data)).toBe(0)
    })
  })

  describe('valid input', () => {
    it('compares the latest MA13 with the MA13 from 52 weeks earlier', () => {
      const data = [
        ...Array.from({ length: 13 }, (_, i) => price(10, i)),
        ...Array.from({ length: 39 }, (_, i) => price(15, i + 13)),
        ...Array.from({ length: 13 }, (_, i) => price(20, i + 52)),
      ]

      expect(calculateYoY(data)).toBe(100)
    })
  })
})

describe('getWeeklyOHLC', () => {
  it('returns zero values for empty data', () => {
    expect(getWeeklyOHLC([])).toEqual({ open: 0, high: 0, low: 0, close: 0 })
  })

  it('returns the latest week OHLC values', () => {
    expect(getWeeklyOHLC([price(10, 0), price(20, 1)])).toEqual({
      open: 19,
      high: 21,
      low: 18,
      close: 20,
    })
  })
})

describe('calculateMetrics', () => {
  it('returns default metrics for empty data', () => {
    expect(calculateMetrics([])).toEqual({
      currentPrice: 0,
      previousClose: 0,
      ma13: 0,
      yoyChange: 0,
    })
  })

  it('returns current, previous, MA13, and YoY metrics', () => {
    const data = [
      ...Array.from({ length: 13 }, (_, i) => price(10, i)),
      ...Array.from({ length: 39 }, (_, i) => price(15, i + 13)),
      ...Array.from({ length: 13 }, (_, i) => price(20, i + 52)),
    ]

    expect(calculateMetrics(data)).toEqual({
      currentPrice: 20,
      previousClose: 20,
      ma13: 20,
      yoyChange: 100,
    })
  })
})

describe('calculateWeeklyYoY', () => {
  it('returns an empty array for empty data', () => {
    expect(calculateWeeklyYoY([])).toEqual([])
  })

  it('returns null until a comparable 52-week prior MA13 exists', () => {
    const data = [
      ...Array.from({ length: 13 }, (_, i) => price(10, i)),
      ...Array.from({ length: 39 }, (_, i) => price(15, i + 13)),
      ...Array.from({ length: 13 }, (_, i) => price(20, i + 52)),
    ]

    const result = calculateWeeklyYoY(data)

    expect(result.at(12)).toBeNull()
    expect(result.at(-1)).toBe(100)
  })
})
