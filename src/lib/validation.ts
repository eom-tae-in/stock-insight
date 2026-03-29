import { z } from 'zod'

/**
 * Ticker 입력 검증 스키마
 *
 * 글로벌 주식 심볼 규칙:
 * - 1~12자 (AAPL, BRK.B, 005930.KS, 0700.HK, 600000.SS, etc.)
 * - 영문 대문자, 숫자, 점(.) 허용
 * - 마켓 코드: .US, .KS(한국), .HK(홍콩), .SS(상하이), .SZ(심천) 등
 */
export const TickerInputSchema = z
  .string()
  .min(1, '종목 심볼을 입력하세요')
  .max(12, '종목 심볼은 12자 이내여야 합니다')
  .toUpperCase()
  .regex(/^[A-Z0-9.]+$/, '영문 대문자, 숫자, 점(.)만 입력 가능합니다')

/**
 * 주가 데이터 포인트 검증
 */
export const PriceDataPointSchema = z.object({
  date: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  close: z.number().positive('주가는 양수여야 합니다'),
  open: z.number().positive().optional(),
  high: z.number().positive().optional(),
  low: z.number().positive().optional(),
  volume: z.number().nonnegative().optional(),
})

/**
 * Google Trends 데이터 포인트 검증
 */
export const TrendsDataPointSchema = z.object({
  date: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  value: z
    .number()
    .min(0, '값은 0 이상이어야 합니다')
    .max(100, '값은 100 이하여야 합니다'),
})

/**
 * 검색 결과 검증 (API로부터 수신)
 */
export const SearchRecordSchema = z.object({
  id: z.string(),
  ticker: TickerInputSchema,
  company_name: z.string().min(1, '회사명은 필수입니다'),
  current_price: z.number().positive('현재가는 양수여야 합니다'),
  previous_close: z.number().positive().optional(),
  ma13: z.number().positive().optional(),
  yoy_change: z.number(),
  week52_high: z.number().positive().optional(),
  week52_low: z.number().positive().optional(),
  price_data: z.array(PriceDataPointSchema),
  trends_data: z.array(TrendsDataPointSchema),
  last_updated_at: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
  searched_at: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
  created_at: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
})

/**
 * Yahoo Finance API 응답 검증
 */
export const YahooFinancePriceResponseSchema = z.object({
  date: z.number().int('date는 Unix timestamp(정수)여야 합니다'),
  close: z.number(),
  open: z.number().optional(),
  high: z.number().optional(),
  low: z.number().optional(),
  volume: z.number().optional(),
  adjClose: z.number().optional(),
})

export const YahooFinanceHistoricalDataSchema = z.object({
  quotes: z.array(YahooFinancePriceResponseSchema),
  currency: z.string().optional(),
})

/**
 * Google Trends 데이터 포인트 검증
 */
export const GoogleTrendsDataSchema = z.object({
  date: z.number().int(),
  value: z.number().min(0).max(100),
})

/**
 * 기술 지표 검증
 */
export const MetricsSchema = z.object({
  currentPrice: z.number().positive(),
  previousClose: z.number().positive().optional(),
  ma13: z.number().positive(),
  yoyChange: z.number(),
  week52High: z.number().positive(),
  week52Low: z.number().positive(),
})
