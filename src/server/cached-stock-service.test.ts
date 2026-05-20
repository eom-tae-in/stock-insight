import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildStockDataCacheKey,
  fetchCachedStockData,
} from './cached-stock-service'
import { fetchStockData } from '@/lib/services/stock-service'

vi.mock('@/lib/services/stock-service', () => ({
  fetchStockData: vi.fn(),
}))

describe('cached-stock-service', () => {
  const originalEnv = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  }
  const stockData = {
    companyName: 'Apple Inc.',
    currentPrice: 120,
    previousClose: 110,
    currency: 'USD',
    priceData: [{ date: '2026-01-01', close: 120 }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = originalEnv.UPSTASH_REDIS_REST_URL
    process.env.UPSTASH_REDIS_REST_TOKEN = originalEnv.UPSTASH_REDIS_REST_TOKEN
    vi.unstubAllGlobals()
  })

  it('builds an uppercased cache key with period and interval', () => {
    expect(buildStockDataCacheKey('aapl')).toMatch(
      /^stock-data:v1:AAPL:5y:1wk:\d{4}-\d{2}-\d{2}$/
    )
  })

  it('fetches stock data directly when Redis is not configured', async () => {
    vi.mocked(fetchStockData).mockResolvedValue(stockData)

    await expect(fetchCachedStockData(' aapl ')).resolves.toEqual(stockData)

    expect(fetchStockData).toHaveBeenCalledWith('AAPL')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns cached stock data when Redis has a valid result', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test/'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ result: JSON.stringify(stockData) }),
    } as Response)

    await expect(fetchCachedStockData('AAPL')).resolves.toEqual(stockData)

    expect(fetchStockData).not.toHaveBeenCalled()
  })

  it('falls back to stock service and writes cache when Redis is empty', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test/'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
      } as Response)
    vi.mocked(fetchStockData).mockResolvedValue(stockData)

    await expect(fetchCachedStockData('AAPL')).resolves.toEqual(stockData)

    expect(fetchStockData).toHaveBeenCalledWith('AAPL')
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
