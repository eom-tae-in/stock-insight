import { describe, expect, it } from 'vitest'
import {
  formatChange,
  formatDisplayPrice,
  formatInterest,
  formatVolume,
  formatWeek,
} from './display'
describe('숫자 표시', () => {
  it.each([
    [2.345, '+2.35%'],
    [-1.82, '−1.82%'],
    [0, '+0.00%'],
    [-0, '+0.00%'],
    [-0.001, '−0.00%'],
    [null, '—'],
    [NaN, '—'],
    [Infinity, '—'],
  ] as const)('등락 %s를 %s로 표시한다', (input, expected) => {
    // Given / When / Then
    const result = formatChange(input)
    expect(result).toBe(expected)
  })
  it('비율은 한 자리로 표시한다', () => {
    const value = -48.24
    const result = formatChange(value, 'ratio')
    expect(result).toBe('−48.2%')
  })
  it('같은 지수 차이는 p로 표시한다', () => {
    const value = 6
    const result = formatChange(value, 'points')
    expect(result).toBe('+6p')
  })
  it.each([
    [187.62, 'USD', '$187.62'],
    [1050, 'EUR', '€1,050.00'],
    [179700, 'KRW', '₩179,700.00'],
    [null, 'USD', '—'],
  ] as const)('가격 %s %s를 표시한다', (value, currency, expected) => {
    const result = formatDisplayPrice(value, currency)
    expect(result).toBe(expected)
  })
  it('관심도는 정수로 표시한다', () => {
    const result = formatInterest(78.4)
    expect(result).toBe('78')
  })
  it.each([
    [1.21e9, '1.21B'],
    [845.3e6, '845.3M'],
    [1234, '1.23K'],
    [0, '0'],
    [null, '—'],
  ] as const)('거래량 %s를 표시한다', (value, expected) => {
    const result = formatVolume(value)
    expect(result).toBe(expected)
  })
  it('연도 경계에서도 ISO 연도와 주차를 표시한다', () => {
    const result = formatWeek('2021-01-01')
    expect(result).toBe('2020년 53주차')
  })
  it('표 주차는 축약한다', () => {
    const result = formatWeek('2026-09-28', true)
    expect(result).toBe('W40')
  })
})
