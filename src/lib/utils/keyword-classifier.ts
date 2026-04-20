/**
 * 키워드 분류 유틸리티
 * 영문(A-Z) / 한글(ㄱ-ㅎ) / 기타(#)로 분류
 */

import type { KeywordRecord } from '@/types/database'

// 한글 유니코드: 가(0xAC00) = ㄱ + 아(0) + (받침 없음)
// 초성 19개 (유니코드 순서)
const HANGUL_CONSONANTS = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
]

// 쌍자음 정규화: ㄲ→ㄱ, ㄸ→ㄷ, ㅃ→ㅂ, ㅆ→ㅅ, ㅉ→ㅈ
const NORMALIZE_INITIALS: Record<string, string> = {
  ㄲ: 'ㄱ',
  ㄸ: 'ㄷ',
  ㅃ: 'ㅂ',
  ㅆ: 'ㅅ',
  ㅉ: 'ㅈ',
}

// 사이드바 표시 순서: A-Z (26) → ㄱ-ㅎ (14) → #
export const ALPHA_INDICES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export const HANGUL_INITIALS = [
  'ㄱ',
  'ㄴ',
  'ㄷ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅅ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
]
export const ALL_INDICES = [...ALPHA_INDICES, ...HANGUL_INITIALS, '#']

// "전체" 인덱스 상수
export const SHOW_ALL_INDEX = 'all'

// 언어 분류 타입
export type KeywordLanguage = 'ko' | 'en' | 'symbol'

/**
 * 키워드의 언어 분류 (한글 / 영어 / 기호)
 * @returns 'ko' (한글) | 'en' (영어) | 'symbol' (숫자/특수문자)
 */
export function getKeywordLanguage(keyword: string): KeywordLanguage {
  const trimmed = keyword.trim()
  if (!trimmed) return 'symbol'

  const firstChar = trimmed[0]
  const code = firstChar.charCodeAt(0)

  // 영문
  if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
    return 'en'
  }

  // 한글
  if (code >= 0xac00 && code <= 0xd7a3) {
    return 'ko'
  }

  // 숫자/기호
  return 'symbol'
}

/**
 * 한글 문자에서 초성 추출
 * 가(0xAC00) ≤ 음절 ≤ 힣(0xD7A3)
 * 초성 인덱스 = Math.floor((charCode - 0xAC00) / (21 * 28))
 */
function getHangulInitial(char: string): string | null {
  const code = char.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return null

  const initialIndex = Math.floor((code - 0xac00) / (21 * 28))
  const initial = HANGUL_CONSONANTS[initialIndex]
  return initial ? (NORMALIZE_INITIALS[initial] ?? initial) : null
}

/**
 * 키워드의 첫 글자를 분류 인덱스로 변환
 * - 영문: 대문자 A-Z
 * - 한글: 초성 ㄱ-ㅎ (쌍자음 정규화)
 * - 기타: '#'
 */
export function getKeywordIndex(keyword: string): string {
  const trimmed = keyword.trim()
  if (!trimmed) return '#'

  const firstChar = trimmed[0]
  const code = firstChar.charCodeAt(0)

  // 영문 대문자
  if (code >= 65 && code <= 90) {
    return firstChar
  }

  // 영문 소문자 → 대문자
  if (code >= 97 && code <= 122) {
    return firstChar.toUpperCase()
  }

  // 한글
  const hangulInitial = getHangulInitial(firstChar)
  if (hangulInitial) {
    return hangulInitial
  }

  // 기타 (숫자, 특수문자 등)
  return '#'
}

/**
 * 키워드 배열을 인덱스별로 그룹핑
 * @returns { [index: string]: KeywordRecord[] }
 */
export function groupKeywordsByIndex(
  keywords: KeywordRecord[]
): Record<string, KeywordRecord[]> {
  const result: Record<string, KeywordRecord[]> = {}

  for (const keyword of keywords) {
    const index = getKeywordIndex(keyword.keyword)
    if (!result[index]) {
      result[index] = []
    }
    result[index].push(keyword)
  }

  return result
}

/**
 * 실제로 키워드가 존재하는 인덱스만 반환 (사이드바 활성 탭 판별용)
 */
export function getActiveIndices(
  grouped: Record<string, KeywordRecord[]>
): string[] {
  return ALL_INDICES.filter(idx => (grouped[idx]?.length ?? 0) > 0)
}

/**
 * 언어별로 키워드 필터링
 */
export function filterKeywordsByLanguage(
  keywords: KeywordRecord[],
  language: KeywordLanguage
): KeywordRecord[] {
  return keywords.filter(k => getKeywordLanguage(k.keyword) === language)
}
