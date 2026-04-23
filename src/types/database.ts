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
 */
export interface SearchRecord {
  id: string // UUID
  user_id: string // 사용자 UUID (필수, RLS 기준)
  ticker: string // 종목 심볼 (예: AAPL)
  company_name: string // 회사명 (예: Apple Inc.)
  currency?: string // ISO 통화 코드 (예: 'USD', 'KRW', 'EUR')
  // 지난주 OHLC 데이터
  weekly_open?: number // 지난주 시가
  weekly_high?: number // 지난주 고가
  weekly_low?: number // 지난주 저가
  // 계산된 지표 (price_data에서 계산되므로 모두 optional)
  current_price?: number // 지난주 종가 (price_data[-1].close)
  previous_close?: number // 그 전주 종가 (price_data[-2].close)
  ma13?: number // 13주 이동평균 (계산된 값)
  yoy_change?: number // 52주 대비 변화율 (%) (계산된 값)
  // 데이터 배열 (항상 로드되어야 함)
  price_data: PriceDataPoint[] // 5년 주간 주가 배열 (필수: stock_price_data 테이블에서 로드)
  trends_data?: TrendsDataPoint[] // 5년 주간 트렌드 배열 (선택: 향후 Google Trends 연동)
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
  weekly_open?: number // 지난주 시가
  weekly_high?: number // 지난주 고가
  weekly_low?: number // 지난주 저가
  current_price: number
  previous_close?: number
  ma13?: number
  yoy_change: number
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
}

/**
 * 계산된 지표 (Metrics의 별칭, ROADMAP 요구사항)
 */
export type CalculatedMetrics = Metrics

/**
 * 키워드 목록/상세 화면에서 사용하는 키워드 레코드.
 *
 * DB 기준 원천은 keywords + 기본 keyword_analysis 조합이다.
 * keyword/search_type/region 필드는 기존 UI 계약을 유지하기 위한 표현 필드다.
 */
export interface KeywordRecord {
  id: string // UUID
  user_id: string // 사용자 UUID (OAuth 로그인한 사용자)
  keyword: string // Google Trends 검색어
  normalized_keyword?: string // 공백 정규화 중복 체크용 키워드
  region: Region // 지역
  search_type: SearchType // 검색 타입
  ma13?: number // 트렌드 지수 기반 13주 이동평균 (0-100)
  yoy_change?: number // 트렌드 지수 기반 52주 YoY (%)
  trends_data: TrendsDataPoint[] // 5년 주간 트렌드 배열
  searched_at: string // ISO 8601 타임스탬프
  created_at: string // ISO 8601 타임스탬프
  updated_at: string // ISO 8601 타임스탬프
  display_order?: number // 내 키워드 목록 정렬 순서
  last_viewed_at?: string | null // 내 키워드에서 마지막으로 본 시간 (미조회 배지 판별용)
}

/**
 * 키워드에 연결된 주식 오버레이 (keyword_stock_overlays 테이블)
 */
export interface KeywordStockOverlay {
  id: string // UUID
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
export type Region =
  | 'GLOBAL'
  | 'US'
  | 'KR'
  | 'JP'
  | 'GB'
  | 'DE'
  | 'FR'
  | 'CA'
  | 'AU'
  | 'IN'
  | 'BR'
  | 'CN'
  | 'TW'
  | 'HK'
  | 'SG'

/**
 * 기간 타입
 */
export type Period =
  | '1M'
  | '3M'
  | '12M'
  | '1Y'
  | '2Y'
  | '3Y'
  | '4Y'
  | '5Y'
  | 'ALL'

/**
 * 검색 타입
 */
export type SearchType = 'WEB' | 'IMAGES' | 'NEWS' | 'YOUTUBE' | 'SHOPPING'

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
  normalized_name?: string // 공백 정규화 중복 체크용 이름
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
  region: Region // parser 입력 지역 코드 (GLOBAL, US, KR 등)
  period: Period // parser 입력 기간 코드 (1M, 3M, 1Y, 5Y 등)
  search_type: SearchType // parser 입력 검색 타입 (WEB, NEWS, YOUTUBE 등)

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
  ticker: string // 종목 심볼 (예: AAPL)
  company_name: string // 회사명 (예: Apple Inc.)
  display_order: number // 그래프에서 표시할 순서
  created_at: string // ISO 8601 타임스탬프
  chart_data?: Array<{
    date: string
    normalizedPrice: number | null
    rawPrice: number | null
  }>
}

/**
 * 마이그레이션 패턴: KeywordRecord → Keyword + KeywordAnalysis
 *
 * 기존 데이터:
 * KeywordRecord {
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
 * - 기존 KeywordRecord는 기본값 (GLOBAL, 5Y, WEB)으로 변환
 * - UNIQUE(keyword_id, region, period, search_type) 보장
 * - 기존 오버레이는 기본 analysis_id로 재매핑
 */
