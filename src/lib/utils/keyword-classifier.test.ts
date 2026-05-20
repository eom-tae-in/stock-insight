import { describe, expect, it } from 'vitest'
import {
  filterKeywordsByLanguage,
  getActiveIndices,
  getKeywordIndex,
  getKeywordLanguage,
  groupKeywordsByIndex,
} from './keyword-classifier'
import type { KeywordRecord } from '@/types/database'

function keyword(id: string, value: string): KeywordRecord {
  return {
    id,
    user_id: 'user-1',
    keyword: value,
    region: 'GLOBAL',
    search_type: 'WEB',
    trends_data: [],
    searched_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

describe('getKeywordLanguage', () => {
  it.each([
    { value: 'Apple', expected: 'en' },
    { value: 'apple', expected: 'en' },
    { value: '가전', expected: 'ko' },
    { value: '123trend', expected: 'symbol' },
    { value: '', expected: 'symbol' },
    { value: '   ', expected: 'symbol' },
  ])('classifies "$value" as $expected', ({ value, expected }) => {
    expect(getKeywordLanguage(value)).toBe(expected)
  })
})

describe('getKeywordIndex', () => {
  it.each([
    { value: 'Apple', expected: 'A' },
    { value: 'battery', expected: 'B' },
    { value: '가전', expected: 'ㄱ' },
    { value: '까치', expected: 'ㄱ' },
    { value: '따뜻한 옷', expected: 'ㄷ' },
    { value: '싸이클', expected: 'ㅅ' },
    { value: '123trend', expected: '#' },
    { value: '', expected: '#' },
  ])('maps "$value" to index $expected', ({ value, expected }) => {
    expect(getKeywordIndex(value)).toBe(expected)
  })
})

describe('keyword grouping helpers', () => {
  const keywords = [
    keyword('1', 'Apple'),
    keyword('2', 'AI'),
    keyword('3', '가전'),
    keyword('4', '123trend'),
  ]

  it('groups keywords by index', () => {
    expect(groupKeywordsByIndex(keywords)).toMatchObject({
      A: [keywords[0], keywords[1]],
      ㄱ: [keywords[2]],
      '#': [keywords[3]],
    })
  })

  it('returns only active indexes in display order', () => {
    expect(
      getActiveIndices({ A: [keywords[0]], ㄱ: [keywords[2]], '#': [] })
    ).toEqual(['A', 'ㄱ'])
  })

  it.each([
    { language: 'en' as const, expected: ['Apple', 'AI'] },
    { language: 'ko' as const, expected: ['가전'] },
    { language: 'symbol' as const, expected: ['123trend'] },
  ])('filters keywords by $language language', ({ language, expected }) => {
    expect(
      filterKeywordsByLanguage(keywords, language).map(item => item.keyword)
    ).toEqual(expected)
  })
})
