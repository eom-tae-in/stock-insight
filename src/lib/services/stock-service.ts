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
import { env } from '@/lib/env'
import type { PriceDataPoint } from '@/types'

const yf = new YahooFinance()

/**
 * Finnhub API 응답 형식
 */
interface FinnhubQuote {
  c: number // currentPrice
  pc: number // previousClose
}

interface FinnhubProfile {
  name: string
}

export interface StockDataResult {
  companyName: string
  currentPrice: number
  previousClose: number
  priceData: PriceDataPoint[]
}

/**
 * Finnhub에서 현재가 조회
 */
async function fetchFinnhubQuote(ticker: string): Promise<FinnhubQuote> {
  if (!env.FINNHUB_API_KEY) {
    throw new Error('FINNHUB_API_KEY is not configured')
  }

  const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${env.FINNHUB_API_KEY}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Finnhub quote request failed: ${response.statusText}`)
  }

  const data = (await response.json()) as FinnhubQuote
  return data
}

/**
 * Finnhub에서 회사명 조회
 */
async function fetchFinnhubProfile(ticker: string): Promise<FinnhubProfile> {
  if (!env.FINNHUB_API_KEY) {
    throw new Error('FINNHUB_API_KEY is not configured')
  }

  const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${env.FINNHUB_API_KEY}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Finnhub profile request failed: ${response.statusText}`)
  }

  const data = (await response.json()) as FinnhubProfile
  return data
}

/**
 * Yahoo Finance에서 주가 데이터 수집
 */
export async function fetchStockData(ticker: string): Promise<StockDataResult> {
  // 1. 회사명 및 현재가 조회 (Finnhub)
  let companyName = ticker
  let currentPrice = 0
  let previousClose = 0

  try {
    const [quoteResult, profileResult] = await Promise.allSettled([
      fetchFinnhubQuote(ticker),
      fetchFinnhubProfile(ticker),
    ])

    if (quoteResult.status === 'fulfilled' && quoteResult.value.c > 0) {
      currentPrice = quoteResult.value.c
      previousClose = quoteResult.value.pc
    }

    if (profileResult.status === 'fulfilled' && profileResult.value.name) {
      companyName = profileResult.value.name
    }
  } catch (error) {
    // Finnhub 실패 시에도 historical로 진행
    console.warn(`Failed to fetch Finnhub data for ${ticker}:`, error)
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
