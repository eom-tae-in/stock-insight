import { describe, expect, it } from 'vitest'

import {
  GoogleTrendsDataSchema,
  MetricsSchema,
  PriceDataPointSchema,
  TickerInputSchema,
  TrendsDataPointSchema,
  YahooFinanceHistoricalDataSchema,
} from './validation'

describe('TickerInputSchema', () => {
  it.each([
    ['aapl', 'AAPL'],
    ['005930.ks', '005930.KS'],
  ])('uppercases and accepts ticker format %s', (input, expected) => {
    expect(TickerInputSchema.parse(input)).toBe(expected)
  })

  it('rejects unsupported characters', () => {
    expect(() => TickerInputSchema.parse('AAPL!')).toThrow()
  })
})

describe('PriceDataPointSchema', () => {
  it('accepts ISO dates and positive prices', () => {
    expect(
      PriceDataPointSchema.parse({
        date: '2024-01-05',
        close: 100,
        volume: 0,
      })
    ).toEqual({
      date: '2024-01-05',
      close: 100,
      volume: 0,
    })
  })

  it('rejects non-positive prices', () => {
    expect(() =>
      PriceDataPointSchema.parse({ date: '2024-01-05', close: 0 })
    ).toThrow()
  })
})

describe('TrendsDataPointSchema', () => {
  it('accepts trend values from 0 to 100', () => {
    expect(
      TrendsDataPointSchema.parse({ date: '2024-01-05', value: 100 })
    ).toEqual({ date: '2024-01-05', value: 100 })
  })

  it('rejects trend values outside 0 to 100', () => {
    expect(() =>
      TrendsDataPointSchema.parse({ date: '2024-01-05', value: 101 })
    ).toThrow()
  })
})

describe('YahooFinanceHistoricalDataSchema', () => {
  it('accepts Yahoo historical quote arrays with optional currency', () => {
    expect(
      YahooFinanceHistoricalDataSchema.parse({
        quotes: [{ date: 1_704_412_800, close: 100 }],
        currency: 'USD',
      })
    ).toEqual({
      quotes: [{ date: 1_704_412_800, close: 100 }],
      currency: 'USD',
    })
  })
})

describe('GoogleTrendsDataSchema', () => {
  it('accepts pytrends numeric date and bounded value', () => {
    expect(
      GoogleTrendsDataSchema.parse({ date: 1_704_412_800, value: 50 })
    ).toEqual({
      date: 1_704_412_800,
      value: 50,
    })
  })
})

describe('MetricsSchema', () => {
  it('accepts positive metrics and numeric YoY changes', () => {
    expect(
      MetricsSchema.parse({
        currentPrice: 100,
        previousClose: 95,
        ma13: 90,
        yoyChange: -5,
        week52High: 120,
        week52Low: 80,
      })
    ).toEqual({
      currentPrice: 100,
      previousClose: 95,
      ma13: 90,
      yoyChange: -5,
      week52High: 120,
      week52Low: 80,
    })
  })
})
