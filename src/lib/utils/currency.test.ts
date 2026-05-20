import { describe, expect, it } from 'vitest'

import {
  formatPrice,
  getCurrencyCodeFromTicker,
  getCurrencyFromTicker,
  getCurrencySymbol,
} from './currency'

describe('formatPrice', () => {
  it.each([
    ['USD with two decimals', 179.7, 'USD', '$179.70'],
    ['zero-decimal KRW', 179700, 'KRW', '₩179,700'],
    ['ticker market fallback', 179700, '005930.KS', '₩179,700'],
    ['unknown currency fallback', 100, 'UNKNOWN', '$100.00'],
    ['unknown ticker suffix fallback', 100, 'ABC.UNKNOWN', '$100.00'],
  ])('formats %s', (_caseName, value, currencyOrTicker, expected) => {
    expect(formatPrice(value, currencyOrTicker)).toBe(expected)
  })
})

describe('getCurrencySymbol', () => {
  it('returns the symbol for a supported ISO currency', () => {
    expect(getCurrencySymbol('EUR')).toBe('€')
  })
})

describe('getCurrencyCodeFromTicker', () => {
  it.each([
    ['known market suffix', '005930.KS', 'KRW'],
    ['ticker without a known market suffix', 'AAPL', 'USD'],
  ])('returns the ISO currency code for %s', (_caseName, ticker, expected) => {
    expect(getCurrencyCodeFromTicker(ticker)).toBe(expected)
  })
})

describe('getCurrencyFromTicker', () => {
  it('keeps backward-compatible ticker currency resolution', () => {
    expect(getCurrencyFromTicker('7203.T')).toEqual({
      symbol: '¥',
      decimals: 0,
    })
  })
})
