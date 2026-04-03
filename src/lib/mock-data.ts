import { subWeeks, format } from 'date-fns'
import type {
  PriceDataPoint,
  TrendsDataPoint,
  SearchRecord,
  Metrics,
} from '@/types'

/**
 * 5년(260주) 전의 월요일 시작 날짜부터 오늘까지의 주간 데이터 생성
 */
function getStartDate(): Date {
  const today = new Date()
  return subWeeks(today, 260)
}

export function generatePriceData(): PriceDataPoint[] {
  const data: PriceDataPoint[] = []
  const startDate = getStartDate()
  let currentPrice = 100

  for (let i = 0; i < 260; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i * 7)

    const change = (Math.random() - 0.5) * 4
    currentPrice = Math.max(80, Math.min(150, currentPrice + change))

    data.push({
      date: format(date, 'yyyy-MM-dd'),
      close: Math.round(currentPrice * 100) / 100,
      open: Math.round(currentPrice * 0.99 * 100) / 100,
      high: Math.round(currentPrice * 1.02 * 100) / 100,
      low: Math.round(currentPrice * 0.98 * 100) / 100,
      volume: Math.floor(Math.random() * 10000000) + 1000000,
    })
  }

  return data
}

export function generateTrendsData(): TrendsDataPoint[] {
  const data: TrendsDataPoint[] = []
  const startDate = getStartDate()
  let currentValue = 50

  for (let i = 0; i < 260; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i * 7)

    const change = (Math.random() - 0.5) * 20
    currentValue = Math.max(10, Math.min(90, currentValue + change))

    data.push({
      date: format(date, 'yyyy-MM-dd'),
      value: Math.round(currentValue),
    })
  }

  return data
}

export function calculateMetrics(priceData: PriceDataPoint[]): Metrics {
  if (priceData.length === 0) {
    return {
      currentPrice: 0,
      ma13: 0,
      yoyChange: 0,
      week52High: 0,
      week52Low: 0,
    }
  }

  const currentPrice = priceData[priceData.length - 1].close
  const previousClose = priceData[priceData.length - 2]?.close || currentPrice

  // MA13: 13주 이동평균
  const ma13Data = priceData.slice(Math.max(0, priceData.length - 13))
  const ma13 =
    ma13Data.reduce((sum, point) => sum + point.close, 0) / ma13Data.length

  // YoY: 52주 전 대비 변화율
  const week52AgoIndex = Math.max(0, priceData.length - 52)
  const week52AgoPrice = priceData[week52AgoIndex].close
  const yoyChange =
    week52AgoPrice > 0
      ? ((currentPrice - week52AgoPrice) / week52AgoPrice) * 100
      : 0

  // 52주 최고/최저
  const week52Data = priceData.slice(Math.max(0, priceData.length - 52))
  const week52High = Math.max(...week52Data.map(p => p.high || p.close))
  const week52Low = Math.min(...week52Data.map(p => p.low || p.close))

  return {
    currentPrice,
    previousClose,
    ma13: Math.round(ma13 * 100) / 100,
    yoyChange: Math.round(yoyChange * 100) / 100,
    week52High: Math.round(week52High * 100) / 100,
    week52Low: Math.round(week52Low * 100) / 100,
  }
}

export function getMockSearchRecords(): SearchRecord[] {
  const mockTickers = [
    { ticker: 'AAPL', name: 'Apple Inc.' },
    { ticker: 'MSFT', name: 'Microsoft Corporation' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.' },
    { ticker: 'TSLA', name: 'Tesla Inc.' },
    { ticker: 'AMZN', name: 'Amazon.com Inc.' },
  ]

  return mockTickers.slice(0, Math.floor(Math.random() * 3) + 3).map(item => {
    const priceData = generatePriceData()
    const trendsData = generateTrendsData()
    const metrics = calculateMetrics(priceData)
    const now = new Date()

    return {
      id: `mock-${item.ticker}`,
      user_id: '00000000-0000-0000-0000-000000000000', // 더미 사용자 ID (mock용)
      ticker: item.ticker,
      company_name: item.name,
      current_price: metrics.currentPrice,
      previous_close: metrics.previousClose,
      ma13: metrics.ma13,
      yoy_change: metrics.yoyChange,
      week52_high: metrics.week52High,
      week52_low: metrics.week52Low,
      price_data: priceData,
      trends_data: trendsData,
      last_updated_at: now.toISOString(),
      searched_at: subWeeks(now, Math.floor(Math.random() * 8)).toISOString(),
      created_at: subWeeks(now, Math.floor(Math.random() * 12)).toISOString(),
    }
  })
}
