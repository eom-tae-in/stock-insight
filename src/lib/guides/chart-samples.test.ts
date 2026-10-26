import { describe, expect, it } from 'vitest'
import { chartSamples, guideValue } from './chart-samples'

describe('teaching chart samples', () => {
  it('preserves missing MA13 until thirteen weeks and uses the existing calculation', () => {
    const points = chartSamples.metrics.data
    expect(points.slice(0, 12).every(point => point.ma13 === null)).toBe(true)
    expect(points[12]?.ma13).toBe(192.86)
    expect(chartSamples.exports.data[0]?.ma13).toBe(193.66)
  })
  it('aligns complete weeks and distinguishes divergence from the stock sample', () => {
    for (const sample of Object.values(chartSamples)) {
      expect(
        sample.data.every(point => new Date(point.date).getUTCDay() === 1)
      ).toBe(true)
      expect(
        sample.data.every(point => point.interest >= 0 && point.interest <= 100)
      ).toBe(true)
    }
    const briefing = chartSamples.briefing.data
    expect(briefing.at(-1)?.close).toBeLessThan(briefing[0]?.close ?? 0)
    expect(briefing.at(-1)?.interest).toBeGreaterThan(
      briefing[0]?.interest ?? 100
    )
  })
  it('keeps price, index and unavailable values unambiguous', () => {
    expect(guideValue('interest', 74)).toBe('74 / 100')
    expect(guideValue('close', 208.4)).toBe('$208.40')
    expect(guideValue('ma13', null)).toBe('— (13주 미만)')
  })
})
