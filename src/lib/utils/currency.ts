/**
 * 국제 통화 지원 유틸리티
 *
 * ticker 마켓 코드에서 통화 정보 파싱 및 가격 포맷팅
 * 예: '005930.KS' → KRW, ₩, 정수 표시
 */

interface CurrencyInfo {
  symbol: string // '₩', '$', 'HK$' 등
  decimals: number // 소수점 자리수 (0 or 2)
}

// 마켓 코드 → 통화 정보 매핑
const MARKET_CURRENCY_MAP: Record<string, CurrencyInfo> = {
  // 아시아
  KS: { symbol: '₩', decimals: 0 }, // 한국
  KQ: { symbol: '₩', decimals: 0 }, // 한국(코스닥)
  T: { symbol: '¥', decimals: 0 }, // 일본
  HK: { symbol: 'HK$', decimals: 2 }, // 홍콩
  SS: { symbol: '¥', decimals: 2 }, // 중국(상하이)
  SZ: { symbol: '¥', decimals: 2 }, // 중국(심천)
  SI: { symbol: 'S$', decimals: 2 }, // 싱가포르

  // 유럽
  L: { symbol: '£', decimals: 2 }, // 런던
  PA: { symbol: '€', decimals: 2 }, // 파리
  AS: { symbol: '€', decimals: 2 }, // 암스테르담
  DE: { symbol: '€', decimals: 2 }, // 뒤셀도르프
  MI: { symbol: '€', decimals: 2 }, // 밀라노
  MC: { symbol: '€', decimals: 2 }, // 마드리드

  // 북미
  TO: { symbol: 'CA$', decimals: 2 }, // 캐나다

  // 오세아니아
  AX: { symbol: 'A$', decimals: 2 }, // 호주
}

const USD: CurrencyInfo = { symbol: '$', decimals: 2 }

/**
 * ticker에서 통화 정보 파싱
 * @param ticker 종목 코드 (예: '005930.KS', 'AAPL')
 * @returns 통화 정보 (기호, 소수점 자리수)
 */
export function getCurrencyFromTicker(ticker: string): CurrencyInfo {
  const parts = ticker.split('.')
  // 마켓 코드가 없으면 USD (미국)
  if (parts.length < 2) return USD

  const marketCode = parts[parts.length - 1].toUpperCase()
  return MARKET_CURRENCY_MAP[marketCode] ?? USD
}

/**
 * 가격을 통화 기호와 함께 포맷팅
 * @param value 가격 (숫자)
 * @param ticker 종목 코드 (통화 결정용)
 * @returns 포맷된 가격 문자열 (예: '₩179,700', '$179.70')
 */
export function formatPrice(value: number, ticker: string): string {
  const { symbol, decimals } = getCurrencyFromTicker(ticker)
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${symbol}${formatted}`
}

/**
 * 통화 기호만 반환 (그래프 Y축 레이블용)
 * @param ticker 종목 코드
 * @returns 통화 기호 (예: '₩', '$', 'HK$')
 */
export function getCurrencySymbol(ticker: string): string {
  return getCurrencyFromTicker(ticker).symbol
}

/**
 * 소수점 자리수만 반환 (포맷팅 시 사용)
 * @param ticker 종목 코드
 * @returns 소수점 자리수 (0 또는 2)
 */
export function getDecimalPlaces(ticker: string): number {
  return getCurrencyFromTicker(ticker).decimals
}
