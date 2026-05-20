import { afterEach, describe, expect, it, vi } from 'vitest'

import { filterTrendsByDays, filterTrendsForTimeframe } from './trends-filter'
import type { TrendsDataPoint } from '@/types/database'

function trend(date: string): TrendsDataPoint {
  return {
    date,
    value: 50,
    ma13Value: null,
    yoyValue: null,
  }
}

describe('trends filter utilities', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns an empty array when no trends data is provided', () => {
    expect(filterTrendsByDays([], 365)).toEqual([])
    expect(filterTrendsForTimeframe([], '1y')).toEqual([])
  })

  it('filters data by ISO week cutoff', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-18T12:00:00Z'))

    const data = [trend('2025-05-05'), trend('2025-05-19'), trend('2026-05-18')]

    expect(filterTrendsByDays(data, 365)).toEqual([
      trend('2025-05-19'),
      trend('2026-05-18'),
    ])
  })

  it('uses custom weeks when timeframe is custom', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-18T12:00:00Z'))

    const data = [trend('2026-04-27'), trend('2026-05-04'), trend('2026-05-18')]

    expect(filterTrendsForTimeframe(data, 'custom', 2)).toEqual([
      trend('2026-05-04'),
      trend('2026-05-18'),
    ])
  })

  it('uses standard timeframe day mappings', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-18T12:00:00Z'))

    const data = [trend('2025-05-05'), trend('2025-05-19'), trend('2026-05-18')]

    expect(filterTrendsForTimeframe(data, '1y')).toEqual([
      trend('2025-05-19'),
      trend('2026-05-18'),
    ])
  })

  it('returns all data for an unknown timeframe without a day mapping', () => {
    const data = [trend('2026-05-18')]

    expect(filterTrendsForTimeframe(data, 'unknown' as '1y')).toBe(data)
  })
})
