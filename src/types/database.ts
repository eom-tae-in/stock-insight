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
  ma13Value: number | null // 13주 이동평균 (0-100)
  yoyValue: number | null // 52주 YoY 변화율 (%)
}

/**
 * 검색 기록 (searches 테이블)
 * 종목의 메타데이터 + 가격 데이터
 *
 * 참고:
 * - DB: user_id, ticker, company_name, currency, created_at, searched_at
 * - stock_price_data: 별도 테이블에 저장 (조회 시 자동으로 로드됨)
 * - keyword_chart_timeseries: 키워드 기반 트렌드 데이터 (SearchRecord와 별도)
 */
export interface SearchRecord {
  id: string // UUID
  user_id: string // 사용자 UUID (필수, RLS 기준)
  ticker: string // 종목 심볼 (예: AAPL)
  company_name: string // 회사명 (예: Apple Inc.)
  currency?: string // ISO 통화 코드 (예: 'USD', 'KRW', 'EUR')
  // 계산된 지표 (price_data에서 계산되므로 모두 optional)
  current_price?: number // 현재 종가 (price_data[-1].close)
  previous_close?: number // 이전 종가 (price_data[-2].close)
  ma13?: number // 13주 이동평균 (계산된 값)
  yoy_change?: number // 연간 변화율 (%) (계산된 값)
  week52_high?: number // 52주 최고가 (계산된 값)
  week52_low?: number // 52주 최저가 (계산된 값)
  // 데이터 배열 (항상 로드되어야 함)
  price_data: PriceDataPoint[] // 5년 주간 주가 배열 (필수: stock_price_data 테이블에서 로드)
  trends_data: TrendsDataPoint[] // 5년 주간 트렌드 배열 (선택: 향후 Google Trends 연동)
  last_updated_at?: string // ISO 8601 타임스탰프
  searched_at: string // ISO 8601 타임스탬프 (DB 필드)
  created_at?: string // ISO 8601 타임스탰프 (DB 필드)
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
  region: Region // 지역
  search_type: SearchType // 검색 타입
  ma13?: number // 트렌드 지수 기반 13주 이동평균 (0-100)
  yoy_change?: number // 트렌드 지수 기반 52주 YoY (%)
  trends_data: TrendsDataPoint[] // 5년 주간 트렌드 배열
  searched_at: string // ISO 8601 타임스탬프
  created_at: string // ISO 8601 타임스탬프
  updated_at: string // ISO 8601 타임스탬프
  last_viewed_at?: string | null // 내 키워드에서 마지막으로 본 시간 (미조회 배지 판별용)
}

/**
 * DB에서 조회한 Keyword Search 레코드 (trends_data는 JSON 문자열)
 */
export interface KeywordSearchRecordRaw {
  id: string
  user_id: string
  keyword: string
  region: Region // 지역
  search_type: SearchType // 검색 타입
  ma13?: number
  yoy_change?: number
  trends_data: string // JSON 문자열
  searched_at: string
  created_at: string
  updated_at: string
  last_viewed_at?: string | null // 내 키워드에서 마지막으로 본 시간
}

/**
 * 키워드에 연결된 주식 오버레이 (keyword_stock_overlays 테이블)
 */
export interface KeywordStockOverlay {
  id: string // UUID
  keyword_search_id: string // keyword_searches.id
  search_id: string // searches.id
  ticker: string // 종목 심볼 (예: AAPL)
  company_name: string // 회사명 (예: Apple Inc.)
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

// ============================================================================
// Phase 1: 조건 조합 기반 키워드 분석 시스템 (신규)
// ============================================================================

/**
 * 지역 타입
 */
export type Region = 'GLOBAL' | 'US' | 'KR' | 'JP' | 'CN'

/**
 * 기간 타입
 */
export type Period = '1Y' | '3Y' | '5Y'

/**
 * 검색 타입
 */
export type SearchType = 'WEB' | 'YOUTUBE'

/**
 * Keyword: 키워드 이름만 저장 (컨테이너)
 *
 * 역할: 단순히 키워드 이름을 관리
 * 1개의 Keyword 아래 N개의 KeywordAnalysis 가능 (조건별)
 *
 * 사용 예:
 * - keyword: "축구"
 * - 여러 분석이 가능:
 *   - 축구 / GLOBAL / 5Y / WEB
 *   - 축구 / US / 5Y / WEB
 *   - 축구 / GLOBAL / 1Y / YOUTUBE
 */
export interface Keyword {
  id: string // UUID
  name: string // 키워드 이름 (예: "축구")
  created_at: string // ISO 8601 타임스탬프
}

/**
 * KeywordAnalysis: 조건 조합별 분석 데이터 (★핵심)
 *
 * 저장 단위: (keyword_id, region, period, search_type) UNIQUE 조합
 * 각 분석은 완전히 독립적인 데이터를 가짐
 *
 * 필드:
 * - trends_data: 해당 조건의 Google Trends 시계열 데이터
 * - ma13_data: 해당 조건의 13주 이동평균
 * - yoy_data: 해당 조건의 52주 YoY
 *
 * 예:
 * - KeywordAnalysis(keyword_id=축구, region=US, period=5Y, type=WEB)
 *   → trends_data: US 기준 5년치 웹 검색 데이터
 *   → 종목들: Apple, Microsoft 등 (이 조건 전용)
 *
 * - KeywordAnalysis(keyword_id=축구, region=GLOBAL, period=5Y, type=WEB)
 *   → trends_data: 전세계 기준 5년치 웹 검색 데이터
 *   → 종목들: Samsung, LG 등 (다른 조건)
 */
export interface KeywordAnalysis {
  id: string // UUID
  keyword_id: string // keywords.id 참조
  region: Region // 지역 (GLOBAL, US, KR, JP, CN)
  period: Period // 기간 (1Y, 3Y, 5Y)
  search_type: SearchType // 검색 타입 (WEB, YOUTUBE)

  // 시계열 데이터
  trends_data: TrendsDataPoint[] // 해당 조건의 트렌드 시계열

  // 지표 (최신값)
  ma13_data?: number // 13주 이동평균 (0-100)
  yoy_data?: number // 52주 YoY (%)

  created_at: string // ISO 8601 타임스탬프
  updated_at?: string // ISO 8601 타임스탬프
}

/**
 * DB에서 조회한 KeywordAnalysis 레코드 (trends_data는 JSON 문자열)
 */
export interface KeywordAnalysisRaw {
  id: string
  keyword_id: string
  region: Region
  period: Period
  search_type: SearchType
  trends_data: string // JSON 문자열
  ma13_data?: number
  yoy_data?: number
  created_at: string
  updated_at?: string
}

/**
 * KeywordAnalysisOverlay: 각 분석의 종목 오버레이 (★중요)
 *
 * ★핵심 규칙: analysis_id 기준 (keyword_id 아님)
 *
 * 의미:
 * - 같은 키워드라도 조건이 다르면 종목도 다름
 * - 축구 / US / 5Y / WEB의 종목: Apple, Microsoft
 * - 축구 / GLOBAL / 5Y / WEB의 종목: Samsung, LG
 *
 * 필터 변경 시 동작:
 * 1. analysis_id 변경
 * 2. 새로운 analysis_id의 종목만 조회
 * 3. 기존 analysis의 종목은 자동 숨김
 */
export interface KeywordAnalysisOverlay {
  id: string // UUID
  analysis_id: string // keyword_analysis.id 참조 (★keyword_id 아님)
  search_id: string // searches.id 참조 (종목 정보)
  ticker: string // 종목 심볼 (예: AAPL)
  company_name: string // 회사명 (예: Apple Inc.)
  display_order: number // 그래프에서 표시할 순서
  created_at: string // ISO 8601 타임스탬프
}

/**
 * 마이그레이션 패턴: KeywordSearchRecord → Keyword + KeywordAnalysis
 *
 * 기존 데이터:
 * KeywordSearchRecord {
 *   id: uuid-1,
 *   keyword: "축구",
 *   trends_data: [...],
 *   ma13: 45.2,
 *   yoy_change: 12.3
 * }
 *
 * 변환 후:
 * Keyword {
 *   id: uuid-1,
 *   name: "축구"
 * }
 *
 * KeywordAnalysis {
 *   id: uuid-100,
 *   keyword_id: uuid-1,
 *   region: "GLOBAL",
 *   period: "5Y",
 *   search_type: "WEB",
 *   trends_data: [...],
 *   ma13_data: 45.2,
 *   yoy_data: 12.3
 * }
 *
 * 규칙:
 * - 기존 KeywordSearchRecord는 기본값 (GLOBAL, 5Y, WEB)으로 변환
 * - UNIQUE(keyword_id, region, period, search_type) 보장
 * - 기존 오버레이 (keyword_search_id) → analysis_id로 재매핑
 */
