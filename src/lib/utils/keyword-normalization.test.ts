import { describe, expect, it } from 'vitest'

import { normalizeKeywordSpacing } from './keyword-normalization'

describe('normalizeKeywordSpacing', () => {
  it.each([
    ['  artificial intelligence  ', 'artificial intelligence'],
    ['AI\tstocks\ntrend', 'AI stocks trend'],
  ])('normalizes whitespace in %s', (input, expected) => {
    expect(normalizeKeywordSpacing(input)).toBe(expected)
  })

  it.each([null, 123, undefined, {}])(
    'returns an empty string for non-string value %s',
    input => {
      expect(normalizeKeywordSpacing(input)).toBe('')
    }
  )
})
