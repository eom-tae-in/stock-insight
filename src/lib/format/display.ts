import { getISOWeek, getISOWeekYear, parseISO } from 'date-fns'
import { getCurrencySymbol } from '@/lib/utils/currency'

export type ChangeKind = 'percent' | 'ratio' | 'points'
const changeFormats = {
  percent: { digits: 2, suffix: '%' },
  ratio: { digits: 1, suffix: '%' },
  points: { digits: 0, suffix: 'p' },
} as const

export function formatChange(
  value: number | null,
  kind: ChangeKind = 'percent'
): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const { digits, suffix } = changeFormats[kind]
  const rounded = Number(Math.abs(value).toFixed(digits))
  const sign = value < 0 ? '−' : '+'
  return `${sign}${rounded.toFixed(digits)}${suffix}`
}

export function formatDisplayPrice(
  value: number | null,
  currency: string
): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return (
    getCurrencySymbol(currency) +
    value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

export function formatInterest(value: number | null): string {
  return value === null || !Number.isFinite(value)
    ? '—'
    : Math.round(value).toString()
}

export function formatVolume(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const magnitude = Math.abs(value)
  const unit =
    magnitude >= 1e9
      ? { scale: 1e9, suffix: 'B' }
      : magnitude >= 1e6
        ? { scale: 1e6, suffix: 'M' }
        : magnitude >= 1e3
          ? { scale: 1e3, suffix: 'K' }
          : { scale: 1, suffix: '' }
  return (
    (value / unit.scale).toLocaleString('en-US', { maximumFractionDigits: 2 }) +
    unit.suffix
  )
}

export function formatWeek(date: string, compact = false): string {
  const parsed = parseISO(date)
  const week = getISOWeek(parsed)
  return compact ? `W${week}` : `${getISOWeekYear(parsed)}년 ${week}주차`
}
