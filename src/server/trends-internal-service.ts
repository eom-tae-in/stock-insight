import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { calculateTrendsMA13 } from '@/lib/indicators'
import { normalizeKeywordSpacing } from '@/lib/utils/keyword-normalization'
import type { TrendsDataPoint } from '@/types/database'

const execFileAsync = promisify(execFile)

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

export class TrendsProviderError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 502
  ) {
    super(message)
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

function isVercelRuntime(): boolean {
  return process.env.VERCEL === '1'
}

function parseRawTrendsData(data: unknown, source: string) {
  if (!Array.isArray(data)) {
    throw new TrendsProviderError(
      'INVALID_TRENDS_RESPONSE',
      `${source} Trends response is not an array`
    )
  }

  const trendsData = data
    .map(toRawTrendsDataPoint)
    .filter((point): point is RawTrendsDataPoint => point !== null)

  if (trendsData.length === 0) {
    throw new TrendsProviderError(
      'NO_TRENDS_DATA',
      'No valid Trends data points returned'
    )
  }

  return trendsData
}

class LocalSpawnTrendsProvider implements TrendsProvider {
  async fetch({
    keyword,
    geo,
    timeframe,
    gprop,
  }: Required<FetchInternalTrendsDataParams>) {
    const pythonPath = path.join(process.cwd(), '.venv', 'bin', 'python3')
    const scriptPath = path.join(process.cwd(), 'src', 'lib', 'get_trends.py')

    const { stdout, stderr } = await execFileAsync(pythonPath, [
      scriptPath,
      keyword,
      geo,
      timeframe,
      gprop,
    ])

    if (stderr) {
      console.warn(`Python stderr: ${stderr}`)
    }

    return parseRawTrendsData(JSON.parse(stdout), 'Local Python')
  }
}

class VercelPythonTrendsProvider implements TrendsProvider {
  async fetch({
    keyword,
    geo,
    timeframe,
    gprop,
  }: Required<FetchInternalTrendsDataParams>) {
    const vercelUrl = process.env.VERCEL_URL
    if (!vercelUrl) {
      throw new TrendsProviderError(
        'VERCEL_URL_MISSING',
        'VERCEL_URL is not set; cannot reach /api/pytrends',
        500
      )
    }

    const response = await fetch(`https://${vercelUrl}/api/pytrends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, geo, timeframe, gprop }),
    })

    if (!response.ok) {
      throw new TrendsProviderError(
        'PYTRENDS_FUNCTION_FAILED',
        `Vercel /api/pytrends failed: ${response.status} ${response.statusText}`,
        response.status
      )
    }

    const json: unknown = await response.json()
    if (
      typeof json !== 'object' ||
      json === null ||
      (json as { success?: unknown }).success !== true
    ) {
      throw new TrendsProviderError(
        'PYTRENDS_FUNCTION_FAILED',
        'Vercel /api/pytrends returned unsuccessful payload'
      )
    }

    return parseRawTrendsData(
      (json as { data?: unknown }).data,
      'Vercel /api/pytrends'
    )
  }
}

function getTrendsProvider(): TrendsProvider {
  return isVercelRuntime()
    ? new VercelPythonTrendsProvider()
    : new LocalSpawnTrendsProvider()
}

export async function fetchInternalTrendsData({
  keyword,
  geo = '',
  timeframe = '5y',
  gprop = '',
}: FetchInternalTrendsDataParams): Promise<RawTrendsDataPoint[]> {
  const normalizedKeyword = normalizeKeywordSpacing(keyword)

  if (!normalizedKeyword) {
    throw new Error('Keyword is required')
  }

  return getTrendsProvider().fetch({
    keyword: normalizedKeyword,
    geo,
    timeframe,
    gprop,
  })
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
