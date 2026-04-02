/**
 * 트렌드 분석 공유 상수 및 타입
 * - 서버(route.ts)와 클라이언트(keyword-trends-client.tsx) 간 일관성 유지
 */

// F027: 타임프레임 리터럴 타입 정의
export const TIMEFRAMES = ['w', '1y', '2y', '3y', '4y', '5y'] as const
export type Timeframe = (typeof TIMEFRAMES)[number]

// 타임프레임 레이블 맵
export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  w: '4주',
  '1y': '1년',
  '2y': '2년',
  '3y': '3년',
  '4y': '4년',
  '5y': '5년',
} as const

// 각 타임프레임의 날짜 범위 (일 단위, 'w' 제외 - 포인트 수 기반 처리)
// 프론트 필터링용: 5y 전체 데이터에서 해당 기간 데이터만 추출
export const TIMEFRAME_DAYS: Partial<Record<Timeframe, number>> = {
  '1y': 365,
  '2y': 730,
  '3y': 1095,
  '4y': 1460,
  '5y': 1825,
} as const

// 기본 타임프레임
export const DEFAULT_TIMEFRAME: Timeframe = '5y'

// 지리 코드 (Geo) 리터럴 타입
export const GEO_CODES = [
  '',
  'US',
  'KR',
  'JP',
  'CN',
  'GB',
  'DE',
  'FR',
  'IN',
  'BR',
  'AU',
] as const
export type GeoCode = (typeof GEO_CODES)[number]

// Gprop (검색 범위) 리터럴 타입
export const GPROPS = ['', 'youtube', 'news', 'froogle', 'images'] as const
export type Gprop = (typeof GPROPS)[number]

// 오버레이 색상 팔레트 (기존 차트 색상과 충돌 없음)
// 기존: #3b82f6(파랑), #f97316(주황), #ec4899(분홍)
export const OVERLAY_COLORS = [
  '#10b981', // 에메랄드 초록
  '#8b5cf6', // 보라
  '#06b6d4', // 청록
  '#6366f1', // 인디고
  '#ec4899', // 핫핑크 (분홍 - 더 밝은 톤)
] as const
