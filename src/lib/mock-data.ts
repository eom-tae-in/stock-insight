import { subWeeks, format } from 'date-fns'
import type {
  PriceDataPoint,
  TrendsDataPoint,
  SearchRecord,
  Metrics,
} from '@/types'
import { calculateTrendsMA13 } from '@/lib/indicators'

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
  const rawData: Omit<TrendsDataPoint, 'ma13Value' | 'yoyValue'>[] = []
  const startDate = getStartDate()
  let currentValue = 50

  for (let i = 0; i < 260; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i * 7)

    const change = (Math.random() - 0.5) * 20
    currentValue = Math.max(10, Math.min(90, currentValue + change))

    rawData.push({
      date: format(date, 'yyyy-MM-dd'),
      value: Math.round(currentValue),
    })
  }

  // ma13Value 계산
  const ma13Values = calculateTrendsMA13(rawData as TrendsDataPoint[])

  // yoyValue 계산 (각 포인트별 52주 YoY)
  const weeksInYear = 52
  const yoyValuesArray = rawData.map((point, idx) => {
    if (idx < weeksInYear) return null
    const currentVal = point.value
    const previousYearValue = rawData[idx - weeksInYear].value
    if (previousYearValue === 0) return null
    const yoy = ((currentVal - previousYearValue) / previousYearValue) * 100
    return Math.round(yoy * 100) / 100
  })

  // 최종 데이터 (ma13Value, yoyValue 포함)
  const data: TrendsDataPoint[] = rawData.map((point, idx) => ({
    date: point.date,
    value: point.value,
    ma13Value: ma13Values[idx] ?? null,
    yoyValue: yoyValuesArray[idx] ?? null,
  }))

  return data
}

export function calculateMetrics(priceData: PriceDataPoint[]): Metrics {
  if (priceData.length === 0) {
    return {
      currentPrice: 0,
      ma13: 0,
      yoyChange: 0,
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

  return {
    currentPrice,
    previousClose,
    ma13: Math.round(ma13 * 100) / 100,
    yoyChange: Math.round(yoyChange * 100) / 100,
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
      price_data: priceData,
      trends_data: trendsData,
      last_updated_at: now.toISOString(),
      searched_at: subWeeks(now, Math.floor(Math.random() * 8)).toISOString(),
      created_at: subWeeks(now, Math.floor(Math.random() * 12)).toISOString(),
    }
  })
}
