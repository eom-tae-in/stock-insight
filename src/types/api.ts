/**
 * Yahoo Finance API 응답 타입
 */
export interface YahooFinancePriceData {
  date: number // Unix timestamp
  close: number
  open: number
  high: number
  low: number
  volume: number
  adjClose?: number
}

export interface YahooFinanceQuoteSummary {
  quoteSummary: {
    result: {
      summaryProfile?: {
        longBusinessSummary?: string
        industry?: string
        sector?: string
      }
      price?: {
        regularMarketPrice?: {
          raw: number
        }
        regularMarketDayHigh?: {
          raw: number
        }
        regularMarketDayLow?: {
          raw: number
        }
      }
    }
  }
}

export interface YahooFinanceHistoricalData {
  quotes: YahooFinancePriceData[]
  currency: string
}

/**
 * SerpAPI Google Trends 응답 타입
 */
export interface GoogleTrendsData {
  date: number // Unix timestamp
  value: number // 0-100
}

export interface SerpAPIGoogleTrendsResponse {
  search_metadata?: {
    status: string
    json_endpoint?: string
    created_at?: string
    processed_at?: string
    google_url?: string
  }
  interest_over_time?: {
    timeline_data: Array<{
      date: number
      values: Array<{
        query: string
        value: number
      }>
      hasData: boolean[]
    }>
  }
  error?: string
}

/**
 * API 에러 응답
 */
export interface APIError {
  code: string
  message: string
  details?: Record<string, unknown>
}
