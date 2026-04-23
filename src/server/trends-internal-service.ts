import { calculateTrendsMA13 } from '@/lib/indicators'
import { normalizeKeywordSpacing } from '@/lib/utils/keyword-normalization'
import { getLastCompletedWeekKey } from '@/lib/utils/week-sync'
import type { TrendsDataPoint } from '@/types/database'
import { headers } from 'next/headers'
const MAX_TRENDS_ATTEMPTS = 4
const BASE_BACKOFF_MS = 1000
const MAX_JITTER_MS = 500
const TRENDS_CACHE_TTL_SECONDS = Number(
  process.env.TRENDS_CACHE_TTL_SECONDS ?? 60 * 60 * 24
)

export interface RawTrendsDataPoint {
  date: string
  value: number
}

export interface FetchInternalTrendsDataParams {
  keyword: string
  geo?: string
  timeframe?: string
  gprop?: string
}

type RedisResponse<T> = {
  result?: T
  error?: string
}

export type TrendsErrorClassification =
  | 'RATE_LIMIT' // 429 등 일시적 실패 (재시도 필요)
  | 'NO_DATA' // 정상 응답이지만 데이터 없음 (재시도 불필요)

export class TrendsProviderError extends Error {
  constructor(
    public code: string,
    message: string,
    public type: TrendsErrorClassification = 'NO_DATA',
    public status: number = 502
  ) {
    super(message)
  }
}

function maskSecret(secret: string | undefined): string {
  if (!secret) return 'missing'

  return `${secret.slice(0, 6)}... (len=${secret.length})`
}

function calculateBackoffWithJitter(attemptIndex: number): number {
  const baseMs = Math.pow(2, attemptIndex) * BASE_BACKOFF_MS
  const jitterMs = Math.floor(Math.random() * MAX_JITTER_MS)

  return baseMs + jitterMs
}

function isRetryableTrendsError(error: unknown): boolean {
  if (!(error instanceof TrendsProviderError)) return false

  return (
    error.type === 'RATE_LIMIT' ||
    error.status === 408 ||
    error.status === 429 ||
    error.status >= 500
  )
}

function getErrorMeta(error: unknown) {
  if (error instanceof TrendsProviderError) {
    return {
      code: error.code,
      type: error.type,
      status: error.status,
      message: error.message,
    }
  }

  return {
    code: 'TRENDS_FETCH_FAILED',
    type: 'NO_DATA' as TrendsErrorClassification,
    status: 502,
    message: error instanceof Error ? error.message : String(error),
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

function buildTrendsCacheKey({
  keyword,
  geo,
  timeframe,
  gprop,
}: Required<FetchInternalTrendsDataParams>) {
  const keyPayload = JSON.stringify({
    keyword,
    geo: geo || 'GLOBAL',
    timeframe,
    gprop: gprop || 'WEB',
    completedWeek: getLastCompletedWeekKey(),
  })

  return `trends-data:v1:${Buffer.from(keyPayload).toString('base64url')}`
}

function isRawTrendsDataPoint(value: unknown): value is RawTrendsDataPoint {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<RawTrendsDataPoint>
  return (
    typeof candidate.date === 'string' && typeof candidate.value === 'number'
  )
}

function isRawTrendsData(value: unknown): value is RawTrendsDataPoint[] {
  return Array.isArray(value) && value.every(isRawTrendsDataPoint)
}

async function redisGetTrends(
  key: string
): Promise<RawTrendsDataPoint[] | null> {
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
      console.warn(
        `[trends-cache] get failed key="${key}" status=${response.status}`
      )
      return null
    }

    const body = (await response.json()) as RedisResponse<string | null>
    if (!body.result) return null

    const parsed: unknown = JSON.parse(body.result)
    if (!isRawTrendsData(parsed)) {
      console.warn(`[trends-cache] invalid payload key="${key}"`)
      return null
    }

    return parsed
  } catch (error) {
    console.warn(`[trends-cache] get failed key="${key}"`, error)
    return null
  }
}

async function redisSetTrends(
  key: string,
  value: RawTrendsDataPoint[]
): Promise<void> {
  const config = getRedisConfig()
  if (!config) return

  try {
    const response = await fetch(
      `${config.url}/set/${encodeURIComponent(key)}?EX=${TRENDS_CACHE_TTL_SECONDS}`,
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
      console.warn(
        `[trends-cache] set failed key="${key}" status=${response.status}`
      )
    }
  } catch (error) {
    console.warn(`[trends-cache] set failed key="${key}"`, error)
  }
}

interface TrendsProvider {
  fetch(
    params: Required<FetchInternalTrendsDataParams>
  ): Promise<RawTrendsDataPoint[]>
}

function toRawTrendsDataPoint(point: unknown): RawTrendsDataPoint | null {
  if (typeof point !== 'object' || point === null) return null

  const candidate = point as Record<string, unknown>
  if (typeof candidate.date !== 'string') return null
  if (typeof candidate.value !== 'number') return null

  return {
    date: candidate.date,
    value: candidate.value,
  }
}

async function getPytrendsApiBaseUrl(): Promise<string> {
  try {
    const requestHeaders = await headers()
    const forwardedHost = requestHeaders.get('x-forwarded-host')
    const host = forwardedHost || requestHeaders.get('host')
    const proto =
      requestHeaders.get('x-forwarded-proto') ||
      (host?.includes('localhost') || host?.startsWith('127.0.0.1')
        ? 'http'
        : 'https')

    if (host) {
      return `${proto}://${host}`
    }
  } catch {
    // headers() is unavailable outside a request context. Fall back below.
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) {
    return `https://${vercelUrl}`
  }

  const port = process.env.PORT?.trim() || '3000'
  return `http://127.0.0.1:${port}`
}

function parseRawTrendsData(data: unknown, source: string) {
  if (!Array.isArray(data)) {
    throw new TrendsProviderError(
      'INVALID_TRENDS_RESPONSE',
      `${source} Trends response is not an array`,
      'NO_DATA'
    )
  }

  const trendsData = data
    .map(toRawTrendsDataPoint)
    .filter((point): point is RawTrendsDataPoint => point !== null)

  if (trendsData.length === 0) {
    throw new TrendsProviderError(
      'NO_TRENDS_DATA',
      'No valid Trends data points returned',
      'NO_DATA'
    )
  }

  return trendsData
}

class HttpPytrendsProvider implements TrendsProvider {
  async fetch({
    keyword,
    geo,
    timeframe,
    gprop,
  }: Required<FetchInternalTrendsDataParams>) {
    const internalSecret = process.env.PYTRENDS_INTERNAL_SECRET
    if (!internalSecret) {
      throw new TrendsProviderError(
        'PYTRENDS_INTERNAL_SECRET_MISSING',
        'PYTRENDS_INTERNAL_SECRET is not set; cannot call /api/pytrends safely',
        'NO_DATA',
        500
      )
    }

    const baseUrl = await getPytrendsApiBaseUrl()
    console.info(
      `[trends] internal pytrends auth secret=${maskSecret(internalSecret)} baseUrl="${baseUrl}"`
    )
    const response = await fetch(`${baseUrl}/api/pytrends`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-secret': internalSecret,
      },
      body: JSON.stringify({ keyword, geo, timeframe, gprop }),
      cache: 'no-store',
    })

    if (!response.ok) {
      let errorCode = 'PYTRENDS_FUNCTION_FAILED'
      let errorMessage = `/api/pytrends failed: ${response.status} ${response.statusText}`

      try {
        const errorJson = (await response.json()) as {
          code?: unknown
          error?: unknown
        }

        if (typeof errorJson.code === 'string') {
          errorCode = errorJson.code
        }

        if (typeof errorJson.error === 'string' && errorJson.error.trim()) {
          errorMessage = errorJson.error
        }
      } catch {
        // Keep the HTTP status fallback message when the response is not JSON.
      }

      // 429 rate limit → RATE_LIMIT으로 분류
      const classification: TrendsErrorClassification =
        response.status === 429 ? 'RATE_LIMIT' : 'NO_DATA'

      if (response.status === 404 && !process.env.VERCEL_URL?.trim()) {
        errorCode = 'PYTRENDS_ROUTE_UNAVAILABLE'
        errorMessage =
          'The /api/pytrends runtime is unavailable in this environment. Use `vercel dev` for local Trends requests.'
      }

      throw new TrendsProviderError(
        errorCode,
        errorMessage,
        classification,
        response.status
      )
    }

    let json: unknown
    try {
      json = await response.json()
    } catch {
      throw new TrendsProviderError(
        'PYTRENDS_FUNCTION_INVALID_RESPONSE',
        '/api/pytrends returned invalid JSON',
        'NO_DATA',
        502
      )
    }

    if (
      typeof json !== 'object' ||
      json === null ||
      (json as { success?: unknown }).success !== true
    ) {
      throw new TrendsProviderError(
        'PYTRENDS_FUNCTION_FAILED',
        '/api/pytrends returned unsuccessful payload',
        'NO_DATA'
      )
    }

    return parseRawTrendsData(
      (json as { data?: unknown }).data,
      '/api/pytrends'
    )
  }
}

function getTrendsProvider(): TrendsProvider {
  return new HttpPytrendsProvider()
}

export async function fetchInternalTrendsData({
  keyword,
  geo = '',
  timeframe = 'today 5-y',
  gprop = '',
}: FetchInternalTrendsDataParams): Promise<RawTrendsDataPoint[]> {
  const normalizedKeyword = normalizeKeywordSpacing(keyword)

  if (!normalizedKeyword) {
    throw new Error('Keyword is required')
  }

  const requestParams = {
    keyword: normalizedKeyword,
    geo,
    timeframe,
    gprop,
  }
  const cacheKey = buildTrendsCacheKey(requestParams)
  const cached = await redisGetTrends(cacheKey)

  if (cached) {
    console.info(
      `[trends-cache] hit keyword="${normalizedKeyword}" geo="${geo || 'GLOBAL'}" timeframe="${timeframe}" gprop="${gprop || 'WEB'}" points=${cached.length}`
    )
    return cached
  }

  console.info(
    `[trends-cache] miss keyword="${normalizedKeyword}" geo="${geo || 'GLOBAL'}" timeframe="${timeframe}" gprop="${gprop || 'WEB'}"`
  )

  const provider = getTrendsProvider()
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_TRENDS_ATTEMPTS; attempt++) {
    try {
      console.info(
        `[trends] fetch attempt=${attempt}/${MAX_TRENDS_ATTEMPTS} keyword="${normalizedKeyword}" geo="${geo || 'GLOBAL'}" timeframe="${timeframe}" gprop="${gprop || 'WEB'}"`
      )

      const data = await provider.fetch(requestParams)

      console.info(
        `[trends] fetch success attempt=${attempt}/${MAX_TRENDS_ATTEMPTS} keyword="${normalizedKeyword}" points=${data.length}`
      )

      await redisSetTrends(cacheKey, data)

      return data
    } catch (error) {
      lastError = error
      const meta = getErrorMeta(error)
      const retryable = isRetryableTrendsError(error)
      const canRetry = retryable && attempt < MAX_TRENDS_ATTEMPTS

      console.warn(
        `[trends] fetch failed attempt=${attempt}/${MAX_TRENDS_ATTEMPTS} keyword="${normalizedKeyword}" code=${meta.code} status=${meta.status} retryable=${retryable}`
      )

      if (!canRetry) {
        break
      }

      const waitMs = calculateBackoffWithJitter(attempt - 1)
      console.info(
        `[trends] retry scheduled keyword="${normalizedKeyword}" nextAttempt=${attempt + 1}/${MAX_TRENDS_ATTEMPTS} waitMs=${waitMs}`
      )
      await new Promise(resolve => setTimeout(resolve, waitMs))
    }
  }

  const meta = getErrorMeta(lastError)

  if (lastError instanceof TrendsProviderError) {
    throw new TrendsProviderError(
      lastError.code,
      lastError.type === 'RATE_LIMIT'
        ? `Google Trends rate limit persisted after ${MAX_TRENDS_ATTEMPTS} attempts`
        : lastError.message,
      lastError.type,
      lastError.status
    )
  }

  throw new TrendsProviderError(meta.code, meta.message, meta.type, meta.status)
}

export function buildTrendsDataWithIndicators(
  rawTrendsData: RawTrendsDataPoint[]
): TrendsDataPoint[] {
  const trendPoints: TrendsDataPoint[] = rawTrendsData.map(point => ({
    date: point.date,
    value: point.value || 0,
    ma13Value: null,
    yoyValue: null,
  }))

  const ma13Values = calculateTrendsMA13(trendPoints)

  return trendPoints.map((point, idx) => {
    let yoyValue: number | null = null

    if (idx >= 52) {
      const previousYearValue = trendPoints[idx - 52].value
      if (previousYearValue !== 0) {
        yoyValue = ((point.value - previousYearValue) / previousYearValue) * 100
      }
    }

    return {
      ...point,
      ma13Value: ma13Values[idx] ?? null,
      yoyValue,
    }
  })
}
