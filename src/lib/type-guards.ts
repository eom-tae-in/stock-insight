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
/**
 * SearchRecordRaw를 SearchRecord로 변환 (JSON 파싱 포함)
 *
 * Supabase JSONB는 이미 객체로 반환되므로, 문자열인 경우만 파싱합니다.
 * SQLite는 JSON 문자열로 저장되므로 파싱이 필요합니다.
 * 이 함수는 양쪽 어댑터를 모두 지원합니다.
 */
export function parseSearchRecordRaw(
  raw: SearchRecordRaw | Record<string, unknown>
): SearchRecord {
  try {
    // Phase 6: Supabase 단일 기반 (SQLite 제거 완료)
    // Supabase JSONB는 이미 객체로 반환되지만, 안전상 문자열 처리 분기도 유지합니다.
    // (향후 환경 변경 시 이전 데이터 호환성 유지)
    const priceData =
      typeof raw.price_data === 'string'
        ? JSON.parse(raw.price_data as string)
        : (raw.price_data as PriceDataPoint[])

    const trendsData =
      typeof raw.trends_data === 'string'
        ? JSON.parse(raw.trends_data as string)
        : (raw.trends_data as TrendsDataPoint[])

    return {
      id: raw.id as string,
      ticker: raw.ticker as string,
      company_name: raw.company_name as string,
      currency: raw.currency as string | undefined,
      current_price: raw.current_price as number,
      previous_close: raw.previous_close as number | undefined,
      ma13: raw.ma13 as number | undefined,
      yoy_change: raw.yoy_change as number,
      week52_high: raw.week52_high as number | undefined,
      week52_low: raw.week52_low as number | undefined,
      price_data: priceData,
      trends_data: trendsData,
      last_updated_at: raw.last_updated_at as string,
      searched_at: raw.searched_at as string,
      created_at: raw.created_at as string,
    }
  } catch (error) {
    throw new Error(
      `Failed to parse SearchRecord JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
