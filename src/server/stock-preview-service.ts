import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchCachedStockData } from '@/server/cached-stock-service'
import { calculateMetrics, getWeeklyOHLC } from '@/lib/calculations'
import {
  deleteSearch,
  getSearchByTicker,
  insertPriceData,
  upsertSearch,
} from '@/lib/db/queries'
import type { PriceDataPoint, SearchRecord } from '@/types'

const PREVIEW_CACHE_TTL_SECONDS = Number(
  process.env.PREVIEW_CACHE_TTL_SECONDS ?? 60 * 60 * 24
)

export type StockPreviewData = {
  ticker: string
  companyName: string
  currentPrice: number
  previousClose: number
  currency?: string
  priceData: PriceDataPoint[]
}

export class StockPreviewServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
  }
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

function buildPreviewKey(previewId: string) {
  return `preview:${previewId}`
}

function isStockPreviewData(value: unknown): value is StockPreviewData {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<StockPreviewData>
  return (
    typeof candidate.ticker === 'string' &&
    typeof candidate.companyName === 'string' &&
    typeof candidate.currentPrice === 'number' &&
    typeof candidate.previousClose === 'number' &&
    Array.isArray(candidate.priceData)
  )
}

async function redisGetPreview(previewId: string) {
  const config = getRedisConfig()
  if (!config) {
    throw new StockPreviewServiceError(
      'PREVIEW_CACHE_UNAVAILABLE',
      '미리보기 캐시 설정이 필요합니다.',
      503
    )
  }

  const response = await fetch(
    `${config.url}/get/${encodeURIComponent(buildPreviewKey(previewId))}`,
    {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
      cache: 'no-store',
    }
  )

  if (!response.ok) return null

  const body = (await response.json()) as { result?: string | null }
  if (!body.result) return null

  const parsed: unknown = JSON.parse(body.result)
  return isStockPreviewData(parsed) ? parsed : null
}

async function redisSetPreview(previewId: string, preview: StockPreviewData) {
  const config = getRedisConfig()
  if (!config) {
    throw new StockPreviewServiceError(
      'PREVIEW_CACHE_UNAVAILABLE',
      '미리보기 캐시 설정이 필요합니다.',
      503
    )
  }

  const response = await fetch(
    `${config.url}/set/${encodeURIComponent(buildPreviewKey(previewId))}?EX=${PREVIEW_CACHE_TTL_SECONDS}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify(preview),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new StockPreviewServiceError(
      'PREVIEW_CACHE_WRITE_FAILED',
      '미리보기 데이터를 저장하지 못했습니다.',
      502
    )
  }
}

export async function createStockPreview(ticker: string) {
  const normalizedTicker = ticker.trim().toUpperCase()
  const stockData = await fetchCachedStockData(normalizedTicker)
  const previewId = crypto.randomUUID()

  const preview: StockPreviewData = {
    ticker: normalizedTicker,
    companyName: stockData.companyName,
    currentPrice: stockData.currentPrice,
    previousClose: stockData.previousClose,
    currency: stockData.currency,
    priceData: stockData.priceData,
  }

  await redisSetPreview(previewId, preview)

  return {
    id: previewId,
    ticker: normalizedTicker,
  }
}

export async function getStockPreview(previewId: string) {
  return redisGetPreview(previewId)
}

export async function saveStockPreviewAsSearch(
  supabase: SupabaseClient,
  userId: string,
  previewId: string,
  requestedTicker?: string
) {
  const preview = await getStockPreview(previewId)
  if (!preview) {
    throw new StockPreviewServiceError(
      'PREVIEW_NOT_FOUND',
      '미리보기 데이터를 찾을 수 없습니다.',
      404
    )
  }

  const ticker = (requestedTicker ?? preview.ticker).trim().toUpperCase()
  if (ticker !== preview.ticker) {
    throw new StockPreviewServiceError(
      'TICKER_MISMATCH',
      '미리보기 종목과 저장 요청 종목이 다릅니다.',
      409
    )
  }

  const existingSearch = await getSearchByTicker(ticker, userId, supabase)
  if (existingSearch) {
    throw new StockPreviewServiceError(
      'ALREADY_SAVED',
      '이미 저장된 종목입니다.',
      409
    )
  }

  const now = new Date()
  const metrics = calculateMetrics(preview.priceData)
  const weeklyOHLC = getWeeklyOHLC(preview.priceData)

  const searchRecord: SearchRecord = {
    id: crypto.randomUUID(),
    ticker,
    company_name: preview.companyName,
    currency: preview.currency,
    weekly_open: weeklyOHLC.open,
    weekly_high: weeklyOHLC.high,
    weekly_low: weeklyOHLC.low,
    current_price: metrics.currentPrice,
    previous_close: metrics.previousClose,
    ma13: metrics.ma13,
    yoy_change: metrics.yoyChange,
    price_data: preview.priceData,
    searched_at: now.toISOString(),
    created_at: now.toISOString(),
    last_updated_at: now.toISOString(),
    user_id: userId,
  }

  const savedId = await upsertSearch(searchRecord, supabase)

  try {
    await insertPriceData(savedId, preview.priceData, supabase)
  } catch (error) {
    await deleteSearch(savedId, supabase)
    throw error
  }

  return {
    id: savedId,
    ticker,
  }
}
