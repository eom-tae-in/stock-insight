/**
 * 국제 통화 지원 유틸리티
 *
 * 우선순위:
 * 1. ISO 통화 코드 직접 사용 (Yahoo Finance에서 수집한 'EUR', 'KRW' 등)
 * 2. ticker 마켓 코드 파싱 fallback (기존 데이터 호환)
 */

interface CurrencyInfo {
  symbol: string
  decimals: number
}

// ISO 통화 코드 → 기호/소수점 매핑 (핵심)
const CURRENCY_MAP: Record<string, CurrencyInfo> = {
  // 달러류
  USD: { symbol: '$', decimals: 2 },
  CAD: { symbol: 'CA$', decimals: 2 },
  AUD: { symbol: 'A$', decimals: 2 },
  NZD: { symbol: 'NZ$', decimals: 2 },
  HKD: { symbol: 'HK$', decimals: 2 },
  SGD: { symbol: 'S$', decimals: 2 },
  MXN: { symbol: 'MX$', decimals: 2 },
  BRL: { symbol: 'R$', decimals: 2 },

  // 유럽
  EUR: { symbol: '€', decimals: 2 },
  GBP: { symbol: '£', decimals: 2 },
  CHF: { symbol: 'CHF', decimals: 2 },
  NOK: { symbol: 'kr', decimals: 2 },
  SEK: { symbol: 'kr', decimals: 2 },
  DKK: { symbol: 'kr', decimals: 2 },
  TRY: { symbol: '₺', decimals: 2 },
  PLN: { symbol: 'zł', decimals: 2 },
  CZK: { symbol: 'Kč', decimals: 2 },
  HUF: { symbol: 'Ft', decimals: 0 },

  // 아시아 (정수 표시)
  KRW: { symbol: '₩', decimals: 0 },
  JPY: { symbol: '¥', decimals: 0 },
  IDR: { symbol: 'Rp', decimals: 0 },
  VND: { symbol: '₫', decimals: 0 },

  // 아시아 (소수점)
  CNY: { symbol: '¥', decimals: 2 },
  TWD: { symbol: 'NT$', decimals: 2 },
  THB: { symbol: '฿', decimals: 2 },
  MYR: { symbol: 'RM', decimals: 2 },
  PHP: { symbol: '₱', decimals: 2 },
  INR: { symbol: '₹', decimals: 2 },

  // 중동/아프리카
  ILS: { symbol: '₪', decimals: 2 },
  SAR: { symbol: 'SR', decimals: 2 },
  AED: { symbol: 'AED', decimals: 2 },
  ZAR: { symbol: 'R', decimals: 2 },
}

// 마켓 코드 → ISO 통화 코드 (ticker fallback용)
const MARKET_TO_CURRENCY: Record<string, string> = {
  // 한국
  KS: 'KRW',
  KQ: 'KRW',
  // 일본
  T: 'JPY',
  OS: 'JPY',
  // 중국/홍콩
  HK: 'HKD',
  SS: 'CNY',
  SZ: 'CNY',
  // 동남아
  BK: 'THB',
  JK: 'IDR',
  KL: 'MYR',
  SI: 'SGD',
  PS: 'PHP',
  VN: 'VND',
  // 인도
  NS: 'INR',
  BO: 'INR',
  // 유럽
  L: 'GBP',
  IL: 'GBP',
  PA: 'EUR',
  AS: 'EUR',
  DE: 'EUR',
  F: 'EUR',
  BE: 'EUR',
  MI: 'EUR',
  MC: 'EUR',
  BR: 'EUR',
  HE: 'EUR',
  OL: 'NOK',
  ST: 'SEK',
  CO: 'DKK',
  SW: 'CHF',
  VX: 'CHF',
  IS: 'TRY',
  WA: 'PLN',
  PR: 'CZK',
  BD: 'HUF',
  // 북미
  TO: 'CAD',
  V: 'CAD',
  MX: 'MXN',
  // 남미
  SA: 'BRL',
  BA: 'ARS',
  // 오세아니아
  AX: 'AUD',
  NZ: 'NZD',
  // 대만
  TW: 'TWD',
  TWO: 'TWD',
  // 중동/아프리카
  TA: 'ILS',
  SR: 'SAR',
  DU: 'AED',
  JNB: 'ZAR',
}

/**
 * ISO 통화 코드 또는 ticker에서 통화 정보 파싱
 *
 * - 'EUR', 'KRW' 같은 3자리 ISO 코드 직접 지원
 * - '005930.KS', 'TOYOTA80.BK' 같은 ticker에서 마켓 코드 파싱 (fallback)
 */
function resolveCurrencyInfo(currencyOrTicker: string): CurrencyInfo {
  const upper = currencyOrTicker.toUpperCase().trim()

  // ISO 통화 코드로 직접 매핑 확인
  if (CURRENCY_MAP[upper]) return CURRENCY_MAP[upper]

  // ticker에서 마켓 코드 파싱 (fallback)
  const parts = upper.split('.')
  if (parts.length >= 2) {
    const marketCode = parts[parts.length - 1]
    const isoCode = MARKET_TO_CURRENCY[marketCode]
    if (isoCode && CURRENCY_MAP[isoCode]) return CURRENCY_MAP[isoCode]
  }

  // 기본값: USD
  return CURRENCY_MAP['USD']
}

/**
 * 가격 포맷팅
 * @param value 가격
 * @param currencyOrTicker ISO 코드('EUR') 또는 ticker('4BY1.F') 둘 다 가능
 * @returns '€1.05', '₩179,700', '$179.70'
 */
export function formatPrice(value: number, currencyOrTicker: string): string {
  const { symbol, decimals } = resolveCurrencyInfo(currencyOrTicker)
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${symbol}${formatted}`
}

/**
 * 통화 기호만 반환 (그래프 Y축 레이블용)
 * @param currencyOrTicker ISO 코드 또는 ticker
 * @returns '₩', '$', '€'
 */
export function getCurrencySymbol(currencyOrTicker: string): string {
  return resolveCurrencyInfo(currencyOrTicker).symbol
}

/**
 * ticker에서 ISO 통화 코드 파싱 (DB 저장용)
 * @param ticker '005930.KS', '4BY1.F' 등
 * @returns 'KRW', 'EUR', 'USD' 등
 */
export function getCurrencyCodeFromTicker(ticker: string): string {
  const upper = ticker.toUpperCase().trim()
  const parts = upper.split('.')
  if (parts.length >= 2) {
    const marketCode = parts[parts.length - 1]
    const isoCode = MARKET_TO_CURRENCY[marketCode]
    if (isoCode) return isoCode
  }
  return 'USD'
}

/** @deprecated ticker 기반 파싱 — getCurrencySymbol(currency ?? ticker) 사용 권장 */
export function getCurrencyFromTicker(ticker: string): CurrencyInfo {
  return resolveCurrencyInfo(ticker)
}
