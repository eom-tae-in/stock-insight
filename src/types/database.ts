/**
 * 데이터베이스 스키마 타입 정의
 */

/**
 * 주가 데이터 포인트
 * searches 테이블의 price_data JSON 배열 항목
 */
export interface PriceDataPoint {
  date: string // ISO 8601 (YYYY-MM-DD)
  close: number
  open?: number
  high?: number
  low?: number
  volume?: number
}

/**
 * Google Trends 데이터 포인트
 * trends_data JSON 배열 항목
 */
export interface TrendsDataPoint {
  date: string // ISO 8601 (YYYY-MM-DD)
  value: number // 0-100
}

/**
 * 검색 기록 (searches 테이블)
 * 종목의 메타데이터와 핵심 지표를 저장
 */
export interface SearchRecord {
  id: string // UUID 또는 auto-increment
  ticker: string // 종목 심볼 (예: AAPL)
  company_name: string // 회사명 (예: Apple Inc.)
  currency?: string // ISO 통화 코드 (예: 'USD', 'KRW', 'EUR' - Yahoo Finance에서 수집)
  current_price: number // 현재 종가
  previous_close?: number // 이전 종가
  ma13?: number // 13주 이동평균
  yoy_change: number // 연간 변화율 (%)
  week52_high?: number // 52주 최고가
  week52_low?: number // 52주 최저가
  price_data: PriceDataPoint[] // 5년 주간 주가 배열 (JSON)
  trends_data: TrendsDataPoint[] // 5년 주간 트렌드 배열 (JSON)
  last_updated_at: string // ISO 8601 타임스탬프
  searched_at: string // ISO 8601 타임스탬프
  created_at: string // ISO 8601 타임스탬프
  user_id?: string // 사용자 UUID (OAuth 로그인한 사용자)
}

/**
 * DB에서 조회한 Search 레코드 (price_data, trends_data는 JSON 문자열)
 */
export interface SearchRecordRaw {
  id: string
  ticker: string
  company_name: string
  currency?: string // ISO 통화 코드
  current_price: number
  previous_close?: number
  ma13?: number
  yoy_change: number
  week52_high?: number
  week52_low?: number
  price_data: string // JSON 문자열
  trends_data: string // JSON 문자열
  last_updated_at: string
  searched_at: string
  created_at: string
  user_id?: string // 사용자 UUID
}

/**
 * 기술 지표 계산 결과
 */
export interface Metrics {
  currentPrice: number
  previousClose?: number
  ma13: number
  yoyChange: number // %
  week52High: number
  week52Low: number
}

/**
 * 계산된 지표 (Metrics의 별칭, ROADMAP 요구사항)
 */
export type CalculatedMetrics = Metrics

/**
 * 키워드 기반 검색 기록 (keyword_searches 테이블)
 * Google Trends 데이터를 키워드 기준으로 저장
 */
export interface KeywordSearchRecord {
  id: string // UUID
  user_id: string // 사용자 UUID (OAuth 로그인한 사용자)
  keyword: string // Google Trends 검색어
  ma13?: number // 트렌드 지수 기반 13주 이동평균 (0-100)
  yoy_change?: number // 트렌드 지수 기반 52주 YoY (%)
  trends_data: TrendsDataPoint[] // 5년 주간 트렌드 배열
  searched_at: string // ISO 8601 타임스탬프
  created_at: string // ISO 8601 타임스탬프
  updated_at: string // ISO 8601 타임스탬프
}

/**
 * DB에서 조회한 Keyword Search 레코드 (trends_data는 JSON 문자열)
 */
export interface KeywordSearchRecordRaw {
  id: string
  user_id: string
  keyword: string
  ma13?: number
  yoy_change?: number
  trends_data: string // JSON 문자열
  searched_at: string
  created_at: string
  updated_at: string
}

/**
 * 키워드에 연결된 주식 오버레이 (keyword_stock_overlays 테이블)
 */
export interface KeywordStockOverlay {
  id: string // UUID
  keyword_search_id: string // keyword_searches.id
  search_id: string // searches.id
  display_order: number // 그래프에서 표시할 순서
  created_at: string // ISO 8601 타임스탐프
}

/**
 * F021: 키워드 트렌드 분석 지표
 * Google Trends 데이터의 현재 값, MA13, YoY 변화율을 담음
 */
export interface KeywordTrendsMetrics {
  currentKeywordValue: number // 현재 트렌드 지수 (0-100)
  ma13Value: number | null // 13주 이동평균 (0-100)
  yoyChange: number | null // 52주 대비 변화율 (%)
}
