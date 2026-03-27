import {
  PriceDataPoint,
  TrendsDataPoint,
  SearchRecord,
  SearchRecordRaw,
  Metrics,
} from '@/types/database'
import {
  YahooFinancePriceData,
  YahooFinanceHistoricalData,
  SerpAPIGoogleTrendsResponse,
  APIError,
} from '@/types/api'
import { ProgressState } from '@/types/ui'

/**
 * PriceDataPoint 타입 가드
 */
export function isPriceDataPoint(value: unknown): value is PriceDataPoint {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.date === 'string' &&
    typeof obj.close === 'number' &&
    obj.close > 0 &&
    (obj.open === undefined || typeof obj.open === 'number') &&
    (obj.high === undefined || typeof obj.high === 'number') &&
    (obj.low === undefined || typeof obj.low === 'number') &&
    (obj.volume === undefined || typeof obj.volume === 'number')
  )
}

/**
 * PriceDataPoint 배열 타입 가드
 */
export function isPriceDataPointArray(
  value: unknown
): value is PriceDataPoint[] {
  return Array.isArray(value) && value.every(isPriceDataPoint)
}

/**
 * TrendsDataPoint 타입 가드
 */
export function isTrendsDataPoint(value: unknown): value is TrendsDataPoint {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.date === 'string' &&
    typeof obj.value === 'number' &&
    obj.value >= 0 &&
    obj.value <= 100
  )
}

/**
 * TrendsDataPoint 배열 타입 가드
 */
export function isTrendsDataPointArray(
  value: unknown
): value is TrendsDataPoint[] {
  return Array.isArray(value) && value.every(isTrendsDataPoint)
}

/**
 * SearchRecord 타입 가드
 */
export function isSearchRecord(value: unknown): value is SearchRecord {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.ticker === 'string' &&
    typeof obj.company_name === 'string' &&
    typeof obj.current_price === 'number' &&
    typeof obj.yoy_change === 'number' &&
    isPriceDataPointArray(obj.price_data) &&
    isTrendsDataPointArray(obj.trends_data) &&
    typeof obj.last_updated_at === 'string' &&
    typeof obj.searched_at === 'string' &&
    typeof obj.created_at === 'string'
  )
}

/**
 * SearchRecordRaw 타입 가드 (DB 쿼리 결과용)
 */
export function isSearchRecordRaw(value: unknown): value is SearchRecordRaw {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.ticker === 'string' &&
    typeof obj.company_name === 'string' &&
    typeof obj.current_price === 'number' &&
    typeof obj.yoy_change === 'number' &&
    typeof obj.price_data === 'string' &&
    typeof obj.trends_data === 'string' &&
    typeof obj.last_updated_at === 'string' &&
    typeof obj.searched_at === 'string' &&
    typeof obj.created_at === 'string'
  )
}

/**
 * Metrics 타입 가드
 */
export function isMetrics(value: unknown): value is Metrics {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.currentPrice === 'number' &&
    typeof obj.ma13 === 'number' &&
    typeof obj.yoyChange === 'number' &&
    typeof obj.week52High === 'number' &&
    typeof obj.week52Low === 'number'
  )
}

/**
 * YahooFinancePriceData 타입 가드
 */
export function isYahooFinancePriceData(
  value: unknown
): value is YahooFinancePriceData {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.date === 'number' &&
    typeof obj.close === 'number' &&
    (obj.open === undefined || typeof obj.open === 'number') &&
    (obj.high === undefined || typeof obj.high === 'number') &&
    (obj.low === undefined || typeof obj.low === 'number') &&
    (obj.volume === undefined || typeof obj.volume === 'number')
  )
}

/**
 * YahooFinanceHistoricalData 타입 가드
 */
export function isYahooFinanceHistoricalData(
  value: unknown
): value is YahooFinanceHistoricalData {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    Array.isArray(obj.quotes) &&
    obj.quotes.every(isYahooFinancePriceData) &&
    (obj.currency === undefined || typeof obj.currency === 'string')
  )
}

/**
 * SerpAPIGoogleTrendsResponse 타입 가드
 */
export function isSerpAPIGoogleTrendsResponse(
  value: unknown
): value is SerpAPIGoogleTrendsResponse {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    (obj.search_metadata === undefined ||
      typeof obj.search_metadata === 'object') &&
    (obj.interest_over_time === undefined ||
      typeof obj.interest_over_time === 'object') &&
    (obj.error === undefined || typeof obj.error === 'string')
  )
}

/**
 * APIError 타입 가드
 */
export function isAPIError(value: unknown): value is APIError {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.code === 'string' &&
    typeof obj.message === 'string' &&
    (obj.details === undefined || typeof obj.details === 'object')
  )
}

/**
 * ProgressState 타입 가드
 */
export function isProgressState(value: unknown): value is ProgressState {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  const validStages = [
    'idle',
    'fetching-price',
    'fetching-trends',
    'calculating',
    'saving',
    'complete',
    'error',
  ]
  return (
    validStages.includes(obj.stage as string) &&
    typeof obj.message === 'string' &&
    (obj.error === undefined || typeof obj.error === 'string')
  )
}

/**
 * SearchRecordRaw를 SearchRecord로 변환 (JSON 파싱 포함)
 */
export function parseSearchRecordRaw(raw: SearchRecordRaw): SearchRecord {
  try {
    return {
      ...raw,
      price_data: JSON.parse(raw.price_data),
      trends_data: JSON.parse(raw.trends_data),
    }
  } catch (error) {
    throw new Error(
      `Failed to parse SearchRecord JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * SearchRecord를 SearchRecordRaw로 변환 (JSON 직렬화 포함)
 */
export function stringifySearchRecord(record: SearchRecord): SearchRecordRaw {
  return {
    ...record,
    price_data: JSON.stringify(record.price_data),
    trends_data: JSON.stringify(record.trends_data),
  }
}
