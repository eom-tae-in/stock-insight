import { describe, expect, it } from 'vitest'

import {
  assertPytrendsRequestable,
  parseGeo,
  parseGprop,
  parsePytrendsMultiKeywordParams,
  parsePytrendsParams,
  parseTimeframe,
} from './trends-parsers'

describe('parseGeo', () => {
  describe('valid input', () => {
    it.each([
      ['GLOBAL', ''],
      ['kr', 'KR'],
      ['us-al', 'US-AL'],
    ])('maps %s to %s', (input, expected) => {
      expect(parseGeo(input)).toBe(expected)
    })
  })

  describe('invalid input', () => {
    it.each([
      ['KOREA', 'Invalid geo'],
      [123 as unknown as string, 'geo must be a string'],
    ])('rejects %s', (input, expectedMessage) => {
      expect(() => parseGeo(input)).toThrow(expectedMessage)
    })
  })
})

describe('parseTimeframe', () => {
  describe('valid input', () => {
    it.each([
      ['5Y', 'today 5-y'],
      ['1H', 'now 1-H'],
    ])('maps %s to %s', (input, expected) => {
      expect(parseTimeframe(input)).toBe(expected)
    })
  })

  describe('invalid input', () => {
    it('rejects unsupported timeframe values', () => {
      expect(() => parseTimeframe('10Y')).toThrow('Invalid timeframe')
    })
  })
})

describe('parseGprop', () => {
  describe('valid input', () => {
    it.each([
      ['WEB', ''],
      ['SHOPPING', 'froogle'],
    ])('maps %s to %s', (input, expected) => {
      expect(parseGprop(input)).toBe(expected)
    })
  })

  describe('invalid input', () => {
    it('rejects unsupported search verticals', () => {
      expect(() => parseGprop('BLOG')).toThrow('Invalid gprop')
    })
  })
})

describe('parsePytrendsParams', () => {
  it('builds pytrends-compatible payload params', () => {
    expect(
      parsePytrendsParams({
        keyword: '  tesla  ',
        geo: 'GLOBAL',
        timeframe: '5Y',
        gprop: 'WEB',
      })
    ).toEqual({
      keyword: 'tesla',
      geo: '',
      timeframe: 'today 5-y',
      gprop: '',
      cat: 0,
      buildPayloadParams: {
        kw_list: ['tesla'],
        timeframe: 'today 5-y',
        geo: '',
        gprop: '',
        cat: 0,
      },
    })
  })

  it('rejects a negative category', () => {
    expect(() =>
      parsePytrendsParams({
        keyword: 'tesla',
        geo: 'GLOBAL',
        timeframe: '5Y',
        gprop: 'WEB',
        cat: -1,
      })
    ).toThrow('cat must be a non-negative integer')
  })

  it.each([
    ['empty keyword', ''],
    ['blank keyword', '   '],
  ])('rejects %s', (_caseName, keyword) => {
    expect(() =>
      parsePytrendsParams({
        keyword,
        geo: 'GLOBAL',
        timeframe: '5Y',
        gprop: 'WEB',
      })
    ).toThrow('keyword must not be empty')
  })
})

describe('parsePytrendsMultiKeywordParams', () => {
  it('builds payload params for up to five keywords', () => {
    expect(
      parsePytrendsMultiKeywordParams({
        keywords: ['tesla', 'nvidia'],
        geo: 'US',
        timeframe: '1Y',
        gprop: 'NEWS',
      }).buildPayloadParams
    ).toEqual({
      kw_list: ['tesla', 'nvidia'],
      timeframe: 'today 12-m',
      geo: 'US',
      gprop: 'news',
      cat: 0,
    })
  })

  it.each([
    [
      'more than five keywords',
      ['a', 'b', 'c', 'd', 'e', 'f'],
      'at most 5 items',
    ],
    ['an empty keywords array', [], 'keywords must be a non-empty array'],
    [
      'blank keywords inside the keywords array',
      ['tesla', ' '],
      'keywords[1] must not be empty',
    ],
  ])('rejects %s', (_caseName, keywords, expectedMessage) => {
    expect(() =>
      parsePytrendsMultiKeywordParams({
        keywords,
        geo: 'US',
        timeframe: '1Y',
        gprop: 'WEB',
      })
    ).toThrow(expectedMessage)
  })
})

describe('assertPytrendsRequestable', () => {
  it('does not throw for requestable input', () => {
    expect(() =>
      assertPytrendsRequestable({
        keyword: 'tesla',
        geo: 'GLOBAL',
        timeframe: '5Y',
        gprop: 'WEB',
      })
    ).not.toThrow()
  })
})
