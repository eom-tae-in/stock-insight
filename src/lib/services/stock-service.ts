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

const yf = new YahooFinance()

/**
 * Yahoo Finance의 price 모듈 응답 형식
 */
interface YFPriceModule {
  longName?: string
  currentPrice?: number
  previousClose?: number
}

export interface StockDataResult {
  companyName: string
  currentPrice: number
  previousClose: number
  priceData: PriceDataPoint[]
}

/**
 * Yahoo Finance에서 주가 데이터 수집
 */
export async function fetchStockData(ticker: string): Promise<StockDataResult> {
  // 1. 회사명 및 현재가 조회
  let companyName = ticker
  let currentPrice = 0
  let previousClose = 0

  try {
    const quoteSummaryData = await yf.quoteSummary(ticker, {
      modules: ['price'],
    })

    if (quoteSummaryData?.price) {
      const price = quoteSummaryData.price as YFPriceModule
      companyName = price.longName || ticker
      currentPrice = price.currentPrice ?? 0
      previousClose = price.previousClose ?? 0
    }
  } catch (error) {
    // quoteSummary 실패 시에도 historical로 진행
    console.warn(`Failed to fetch quoteSummary for ${ticker}:`, error)
  }

  // 2. 5년 주간 종가 데이터 수집
  const endDate = new Date()
  const startDate = subYears(endDate, 5)

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
    priceData,
  }
}
