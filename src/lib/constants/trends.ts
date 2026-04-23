/**
 * 트렌드 분석 공유 상수 및 타입
 * - 서버(route.ts)와 클라이언트(keyword-trends-client.tsx) 간 일관성 유지
 */

// F027: 타임프레임 리터럴 타입 정의
export const TIMEFRAMES = ['1y', '2y', '3y', '4y', '5y'] as const
export type Timeframe = (typeof TIMEFRAMES)[number]

// 타임프레임 레이블 맵
export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1y': '1년',
  '2y': '2년',
  '3y': '3년',
  '4y': '4년',
  '5y': '5년',
} as const

// 각 타임프레임의 날짜 범위 (일 단위)
// 프론트 필터링용: 5y 전체 데이터에서 해당 기간 데이터만 추출
export const TIMEFRAME_DAYS: Partial<Record<Timeframe, number>> = {
  '1y': 365,
  '2y': 730,
  '3y': 1095,
  '4y': 1460,
  '5y': 1825,
} as const

export const TIMEFRAME_MAX_WEEKS: Record<Timeframe, number> = {
  '1y': 52,
  '2y': 104,
  '3y': 156,
  '4y': 208,
  '5y': 260,
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

// ==================== 키워드 검색용 옵션 ====================
// 프론트에서 UI로 선택 → 백엔드에 전달할 코드값으로 변환

export const GEO_OPTIONS = [
  { label: '전체', value: 'GLOBAL' },
  { label: '미국', value: 'US' },
  { label: '한국', value: 'KR' },
  { label: '일본', value: 'JP' },
  { label: '중국', value: 'CN' },
  { label: '영국', value: 'GB' },
  { label: '독일', value: 'DE' },
  { label: '프랑스', value: 'FR' },
  { label: '캐나다', value: 'CA' },
  { label: '호주', value: 'AU' },
  { label: '인도', value: 'IN' },
  { label: '브라질', value: 'BR' },
  { label: '대만', value: 'TW' },
  { label: '홍콩', value: 'HK' },
  { label: '싱가포르', value: 'SG' },
] as const
export type GeoValue = (typeof GEO_OPTIONS)[number]['value']

export const TIMEFRAME_OPTIONS = [
  { label: '최근 1개월', value: '1M' },
  { label: '최근 3개월', value: '3M' },
  { label: '최근 12개월', value: '12M' },
  { label: '1년', value: '1Y' },
  { label: '2년', value: '2Y' },
  { label: '3년', value: '3Y' },
  { label: '4년', value: '4Y' },
  { label: '5년', value: '5Y' },
] as const
export type TimeframeValue = (typeof TIMEFRAME_OPTIONS)[number]['value']

export const TIMEFRAME_VALUE_MAX_WEEKS: Record<TimeframeValue, number> = {
  '1M': 5,
  '3M': 14,
  '12M': 52,
  '1Y': 52,
  '2Y': 104,
  '3Y': 156,
  '4Y': 208,
  '5Y': 260,
} as const

export const GPROP_OPTIONS = [
  { label: '웹 검색', value: 'WEB' },
  { label: '이미지', value: 'IMAGES' },
  { label: '뉴스', value: 'NEWS' },
  { label: '유튜브', value: 'YOUTUBE' },
  { label: '쇼핑', value: 'SHOPPING' },
] as const
export type GpropValue = (typeof GPROP_OPTIONS)[number]['value']

// 기본값 (빈값일 때 자동 설정)
export const DEFAULT_GEO: GeoValue = 'GLOBAL'
export const DEFAULT_TIMEFRAME_VALUE: TimeframeValue = '5Y'
export const DEFAULT_GPROP: GpropValue = 'WEB'
