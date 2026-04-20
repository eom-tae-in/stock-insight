import { getLastCompletedWeekKey } from '@/lib/utils/week-sync'
import {
  fetchStockData,
  type StockDataResult,
} from '@/lib/services/stock-service'

const STOCK_DATA_CACHE_TTL_SECONDS = Number(
  process.env.STOCK_DATA_CACHE_TTL_SECONDS ?? 60 * 60 * 24
)

type RedisResponse<T> = {
  result?: T
  error?: string
}

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null
  return {
    url: url.replace(/\/$/, ''),
    token,
  }
}

function buildStockDataCacheKey(ticker: string) {
  return `stock-data:v1:${ticker.toUpperCase()}:5y:1wk:${getLastCompletedWeekKey()}`
}

async function redisGet<T>(key: string): Promise<T | null> {
  const config = getRedisConfig()
  if (!config) return null

  try {
    const response = await fetch(
      `${config.url}/get/${encodeURIComponent(key)}`,
      {
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      console.warn(`Redis GET failed for ${key}: HTTP ${response.status}`)
      return null
    }

    const body = (await response.json()) as RedisResponse<string | null>
    if (!body.result) return null

    return JSON.parse(body.result) as T
  } catch (error) {
    console.warn(`Redis GET failed for ${key}:`, error)
    return null
  }
}

async function redisSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const config = getRedisConfig()
  if (!config) return

  try {
    const response = await fetch(
      `${config.url}/set/${encodeURIComponent(key)}?EX=${ttlSeconds}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify(value),
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      console.warn(`Redis SET failed for ${key}: HTTP ${response.status}`)
    }
  } catch (error) {
    console.warn(`Redis SET failed for ${key}:`, error)
  }
}

function isStockDataResult(value: unknown): value is StockDataResult {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<StockDataResult>
  return (
    typeof candidate.companyName === 'string' &&
    typeof candidate.currentPrice === 'number' &&
    typeof candidate.previousClose === 'number' &&
    Array.isArray(candidate.priceData)
  )
}

export async function fetchCachedStockData(
  ticker: string
): Promise<StockDataResult> {
  const normalizedTicker = ticker.trim().toUpperCase()
  const cacheKey = buildStockDataCacheKey(normalizedTicker)
  const cached = await redisGet<unknown>(cacheKey)

  if (isStockDataResult(cached)) {
    return cached
  }

  const stockData = await fetchStockData(normalizedTicker)
  await redisSet(cacheKey, stockData, STOCK_DATA_CACHE_TTL_SECONDS)

  return stockData
}
