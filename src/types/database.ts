/**
 * 데이터베이스 스키마 타입 정의
 */

/**
 * 주가 데이터 포인트
 * searches 테이블의 price_data JSON 배열 항목
 */
export interface PriceDataPoint {
  date: string; // ISO 8601 (YYYY-MM-DD)
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

/**
 * Google Trends 데이터 포인트
 * trends_data JSON 배열 항목
 */
export interface TrendsDataPoint {
  date: string; // ISO 8601 (YYYY-MM-DD)
  value: number; // 0-100
}

/**
 * 검색 기록 (searches 테이블)
 * 종목의 메타데이터와 핵심 지표를 저장
 */
export interface SearchRecord {
  id: string; // UUID 또는 auto-increment
  ticker: string; // 종목 심볼 (예: AAPL)
  company_name: string; // 회사명 (예: Apple Inc.)
  current_price: number; // 현재 종가
  previous_close?: number; // 이전 종가
  ma13?: number; // 13주 이동평균
  yoy_change: number; // 연간 변화율 (%)
  week52_high?: number; // 52주 최고가
  week52_low?: number; // 52주 최저가
  price_data: PriceDataPoint[]; // 5년 주간 주가 배열 (JSON)
  trends_data: TrendsDataPoint[]; // 5년 주간 트렌드 배열 (JSON)
  last_updated_at: string; // ISO 8601 타임스탬프
  searched_at: string; // ISO 8601 타임스탬프
  created_at: string; // ISO 8601 타임스탬프
}

/**
 * DB에서 조회한 Search 레코드 (price_data, trends_data는 JSON 문자열)
 */
export interface SearchRecordRaw {
  id: string;
  ticker: string;
  company_name: string;
  current_price: number;
  previous_close?: number;
  ma13?: number;
  yoy_change: number;
  week52_high?: number;
  week52_low?: number;
  price_data: string; // JSON 문자열
  trends_data: string; // JSON 문자열
  last_updated_at: string;
  searched_at: string;
  created_at: string;
}

/**
 * 기술 지표 계산 결과
 */
export interface Metrics {
  currentPrice: number;
  previousClose?: number;
  ma13: number;
  yoyChange: number; // %
  week52High: number;
  week52Low: number;
}
