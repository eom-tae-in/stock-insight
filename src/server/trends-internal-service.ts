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

  try {
    const pythonPath = path.join(process.cwd(), '.venv', 'bin', 'python3')
    const scriptPath = path.join(process.cwd(), 'src', 'lib', 'get_trends.py')

    const { stdout, stderr } = await execFileAsync(pythonPath, [
      scriptPath,
      normalizedKeyword,
      geo,
      timeframe,
      gprop,
    ])

    if (stderr) {
      console.warn(`Python stderr: ${stderr}`)
    }

    const parsed = JSON.parse(stdout)
    if (!Array.isArray(parsed)) {
      console.warn('Invalid trends data format: response is not an array')
      return []
    }

    return parsed
      .map(toRawTrendsDataPoint)
      .filter((point): point is RawTrendsDataPoint => point !== null)
  } catch (error) {
    console.error(
      `Python trends execution failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )

    if (error instanceof Error && 'stderr' in error) {
      const errorWithStderr = error as Error & { stderr?: string }
      console.error('stderr:', errorWithStderr.stderr)
    }

    return []
  }
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
