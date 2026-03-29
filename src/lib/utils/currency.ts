/**
 * 국제 통화 지원 유틸리티
 *
 * ticker 마켓 코드에서 통화 정보 파싱 및 가격 포맷팅
 * 예: '005930.KS' → ₩, '7203.T' → ¥, 'TOYOTA80.BK' → ฿
 */

interface CurrencyInfo {
  symbol: string // '₩', '$', 'HK$' 등
  decimals: number // 소수점 자리수 (0 or 2)
}

// 마켓 코드 → 통화 정보 매핑
const MARKET_CURRENCY_MAP: Record<string, CurrencyInfo> = {
  // 한국
  KS: { symbol: '₩', decimals: 0 },
  KQ: { symbol: '₩', decimals: 0 }, // 코스닥

  // 일본
  T: { symbol: '¥', decimals: 0 },
  OS: { symbol: '¥', decimals: 0 }, // 오사카

  // 중국/홍콩
  HK: { symbol: 'HK$', decimals: 2 },
  SS: { symbol: '¥', decimals: 2 }, // 상하이
  SZ: { symbol: '¥', decimals: 2 }, // 심천

  // 동남아
  BK: { symbol: '฿', decimals: 2 }, // 태국 바트
  JK: { symbol: 'Rp', decimals: 0 }, // 인도네시아 루피아
  KL: { symbol: 'RM', decimals: 2 }, // 말레이시아 링깃
  SI: { symbol: 'S$', decimals: 2 }, // 싱가포르 달러
  PS: { symbol: '₱', decimals: 2 }, // 필리핀 페소
  VN: { symbol: '₫', decimals: 0 }, // 베트남 동

  // 인도
  NS: { symbol: '₹', decimals: 2 }, // NSE
  BO: { symbol: '₹', decimals: 2 }, // BSE

  // 유럽
  L: { symbol: '£', decimals: 2 }, // 영국
  IL: { symbol: 'p', decimals: 2 }, // 영국 (페니)
  PA: { symbol: '€', decimals: 2 }, // 프랑스
  AS: { symbol: '€', decimals: 2 }, // 네덜란드
  DE: { symbol: '€', decimals: 2 }, // 독일
  MI: { symbol: '€', decimals: 2 }, // 이탈리아
  MC: { symbol: '€', decimals: 2 }, // 스페인
  BR: { symbol: '€', decimals: 2 }, // 벨기에
  HE: { symbol: '€', decimals: 2 }, // 핀란드
  OL: { symbol: 'kr', decimals: 2 }, // 노르웨이
  ST: { symbol: 'kr', decimals: 2 }, // 스웨덴
  CO: { symbol: 'kr', decimals: 2 }, // 덴마크
  SW: { symbol: 'CHF', decimals: 2 }, // 스위스
  VX: { symbol: 'CHF', decimals: 2 }, // 스위스(SIX)
  IS: { symbol: '₺', decimals: 2 }, // 터키

  // 북미
  TO: { symbol: 'CA$', decimals: 2 }, // 캐나다
  V: { symbol: 'CA$', decimals: 2 }, // 캐나다 벤쿠버
  MX: { symbol: 'MX$', decimals: 2 }, // 멕시코

  // 남미
  SA: { symbol: 'R$', decimals: 2 }, // 브라질
  BA: { symbol: 'ARS$', decimals: 2 }, // 아르헨티나
  SN: { symbol: 'CLP$', decimals: 0 }, // 칠레
  LM: { symbol: 'S/', decimals: 2 }, // 페루

  // 오세아니아
  AX: { symbol: 'A$', decimals: 2 }, // 호주
  NZ: { symbol: 'NZ$', decimals: 2 }, // 뉴질랜드

  // 중동/아프리카
  TA: { symbol: '₪', decimals: 2 }, // 이스라엘
  CA: { symbol: 'SAR', decimals: 2 }, // 사우디 (일부)
}

const USD: CurrencyInfo = { symbol: '$', decimals: 2 }

/**
 * ticker에서 통화 정보 파싱
 * @param ticker 종목 코드 (예: '005930.KS', 'AAPL', 'TOYOTA80.BK')
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
 * @returns 포맷된 가격 문자열 (예: '₩179,700', '$179.70', '฿6.95')
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
