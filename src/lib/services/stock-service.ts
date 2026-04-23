/**
 * Task 009: 주가 데이터 수집 서비스
 *
 * Yahoo Finance2를 사용하여 주가 데이터를 수집합니다.
 * - 회사명, 현재가, 종가 조회
 * - 5년 주간 종가 데이터 수집
 * - 날짜 정규화 (금요일 → 월요일)
 */

import YahooFinance from 'yahoo-finance2'
import { subYears, startOfISOWeek, format } from 'date-fns'
import type { PriceDataPoint } from '@/types'
import { getLastCompletedWeekStart } from '@/lib/utils/week-sync'

const yf = new YahooFinance()

export interface StockDataResult {
  companyName: string
  currentPrice: number
  previousClose: number
  currency?: string // ISO 통화 코드 (예: 'USD', 'KRW', 'EUR')
  priceData: PriceDataPoint[]
}

/**
 * Yahoo Finance에서 주가 데이터 수집
 */
export async function fetchStockData(ticker: string): Promise<StockDataResult> {
  // 한국 주식 (.KS) 감지
  if (ticker.includes('.KS')) {
    throw new Error(
      '한국 주식은 현재 지원하지 않습니다. 미국/글로벌 주식을 검색해주세요.'
    )
  }

  // 1. 회사명, 현재가, 통화, 전일 종가 조회 (Yahoo Finance)
  let companyName = ticker
  let currentPrice = 0
  let previousClose = 0
  let currency: string | undefined

  try {
    const summary = await yf.quoteSummary(ticker, {
      modules: ['price', 'summaryDetail'],
    })

    if (summary.price) {
      const priceData = summary.price

      // 현재가
      if (priceData.regularMarketPrice && priceData.regularMarketPrice > 0) {
        currentPrice = priceData.regularMarketPrice
      }

      // 회사명
      if (priceData.longName) {
        companyName = priceData.longName
      } else if (priceData.shortName) {
        companyName = priceData.shortName
      }

      // 통화 (ISO 코드: 'USD', 'KRW', 'EUR' 등)
      if (priceData.currency) {
        currency = priceData.currency
      }
    }

    // 전일 종가 (summaryDetail 모듈에서만 제공)
    if (
      summary.summaryDetail?.previousClose &&
      summary.summaryDetail.previousClose > 0
    ) {
      previousClose = summary.summaryDetail.previousClose
    }
  } catch (error) {
    // Yahoo Finance 요청 실패 시에도 historical로 진행
    console.warn(`Failed to fetch summary data for ${ticker}:`, error)
  }

  // 2. 5년 주간 종가 데이터 수집
  const endDate = new Date()
  const lastCompletedWeekStart = getLastCompletedWeekStart(endDate)
  const startDate = subYears(lastCompletedWeekStart, 5)

  let historicalData: Array<{
    date: Date
    close: number | null
    open?: number | null
    high?: number | null
    low?: number | null
    volume?: number
  }> = []

  try {
    historicalData = await yf.historical(ticker, {
      period1: startDate,
      period2: endDate,
      interval: '1wk',
      events: 'history',
    })
  } catch (error) {
    throw new Error(`Failed to fetch historical data for ${ticker}: ${error}`)
  }

  // 3. 데이터 필터링 및 정규화
  const priceData: PriceDataPoint[] = []

  for (const quote of historicalData) {
    if (quote.close === null || quote.close === undefined) {
      continue
    }

    // 날짜 정규화: 금요일(또는 다른 weekday) → 월요일(ISO week start)
    const normalizedDate = startOfISOWeek(quote.date)
    if (normalizedDate > lastCompletedWeekStart) {
      continue
    }

    const dateStr = format(normalizedDate, 'yyyy-MM-dd')

    // 중복 날짜 제거 (중복이 있으면 마지막 값 사용)
    const existingIndex = priceData.findIndex(p => p.date === dateStr)

    const point: PriceDataPoint = {
      date: dateStr,
      close: Math.round(quote.close * 100) / 100,
      open: quote.open ? Math.round(quote.open * 100) / 100 : undefined,
      high: quote.high ? Math.round(quote.high * 100) / 100 : undefined,
      low: quote.low ? Math.round(quote.low * 100) / 100 : undefined,
      volume: quote.volume,
    }

    if (existingIndex >= 0) {
      priceData[existingIndex] = point
    } else {
      priceData.push(point)
    }
  }

  // 날짜 정렬
  priceData.sort((a, b) => a.date.localeCompare(b.date))

  if (priceData.length === 0) {
    throw new Error(`No price data available for ${ticker}`)
  }

  // 현재가가 quote에서 못 가져왔으면 마지막 종가 사용
  if (currentPrice === 0) {
    currentPrice = priceData[priceData.length - 1].close
  }

  return {
    companyName,
    currentPrice,
    previousClose: previousClose || currentPrice,
    currency,
    priceData,
  }
}
