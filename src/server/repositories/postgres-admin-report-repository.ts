import type pg from 'pg'
import type {
  AdminAnomaly,
  AdminRecentAnalysis,
  AdminRecentOverlay,
} from '@/server/admin-service'
import type { AdminReportRepository } from './admin-report-repository'

const MIN_TREND_POINTS = 52

type TrendRow = {
  id: string
  keyword_name: string | null
  region: string | null
  period: string | null
  search_type: string | null
  trends_data: Array<{ date?: unknown }> | null
  created_at: Date | string | null
  updated_at: Date | string | null
  recent_at: Date | string | null
}

type OverlayRow = {
  id: string
  ticker: string | null
  company_name: string | null
  keyword_name: string | null
  region: string | null
  period: string | null
  search_type: string | null
  created_at: Date | string | null
  last_refreshed_at: Date | string | null
  recent_at: Date | string | null
  dates: string[] | null
}

export class PostgresAdminReportRepository implements AdminReportRepository {
  constructor(private readonly pool: pg.Pool) {}

  async checkDatabase(): Promise<void> {
    await this.pool.query('SELECT 1 FROM keywords LIMIT 1')
  }

  async getUserCount(): Promise<number | null> {
    return null
  }

  async getKeywordCount(): Promise<number> {
    return this.getCount('keywords')
  }

  async getAnalysisCount(): Promise<number> {
    return this.getCount('keyword_analysis')
  }

  async getOverlayCount(): Promise<number> {
    return this.getCount('keyword_stock_overlays')
  }

  async getUnrefreshedOverlayCount(): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `
      SELECT COUNT(*) AS count
      FROM keyword_stock_overlays
      WHERE last_refreshed_at IS NULL
      `
    )

    return Number(result.rows[0]?.count ?? 0)
  }

  async findRecentAnalyses(): Promise<AdminRecentAnalysis[]> {
    const result = await this.pool.query<TrendRow>(
      `
      SELECT
        ka.id,
        k.name AS keyword_name,
        ka.region,
        ka.period,
        ka.search_type,
        ka.trends_data,
        ka.created_at,
        ka.updated_at,
        COALESCE(ka.updated_at, ka.created_at) AS recent_at
      FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      ORDER BY COALESCE(ka.updated_at, ka.created_at) DESC
      LIMIT 20
      `
    )

    return result.rows.map(row => {
      const dates = getTrendDates(row.trends_data)
      return {
        id: row.id,
        keyword: row.keyword_name ?? '-',
        region: row.region ?? '-',
        searchType: row.search_type ?? '-',
        period: row.period ?? '-',
        pointCount: dates.pointCount,
        firstDate: dates.firstDate,
        lastDate: dates.lastDate,
        refreshedAt: toNullableIso(
          row.recent_at ?? row.updated_at ?? row.created_at
        ),
      }
    })
  }

  async findRecentOverlays(): Promise<AdminRecentOverlay[]> {
    const rows = await this.selectOverlayRows()

    return rows.map(row => {
      const dates = getTimeseriesDates(row.dates)
      return {
        id: row.id,
        keyword: row.keyword_name ?? '-',
        conditionLabel: `${row.region ?? '-'} / ${row.search_type ?? '-'}`,
        ticker: row.ticker ?? '-',
        companyName: row.company_name ?? '-',
        pointCount: dates.pointCount,
        firstDate: dates.firstDate,
        lastDate: dates.lastDate,
        refreshedAt: toNullableIso(
          row.recent_at ?? row.last_refreshed_at ?? row.created_at
        ),
      }
    })
  }

  async findAnomalies(): Promise<AdminAnomaly[]> {
    const anomalies: AdminAnomaly[] = []
    const analyses = await this.pool.query<TrendRow>(
      `
      SELECT
        ka.id,
        k.name AS keyword_name,
        ka.region,
        ka.period,
        ka.search_type,
        ka.trends_data,
        ka.created_at,
        ka.updated_at,
        COALESCE(ka.updated_at, ka.created_at) AS recent_at
      FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      ORDER BY COALESCE(ka.updated_at, ka.created_at) DESC
      LIMIT 100
      `
    )

    for (const row of analyses.rows) {
      const dates = getTrendDates(row.trends_data)
      if (dates.pointCount === 0 || dates.pointCount < MIN_TREND_POINTS) {
        anomalies.push({
          id: row.id,
          type: 'analysis',
          label: row.keyword_name ?? '-',
          reason:
            dates.pointCount === 0
              ? '트렌드 데이터 없음'
              : '트렌드 포인트 부족',
          detail: `${row.region ?? '-'} / ${row.search_type ?? '-'} · ${dates.pointCount}개`,
        })
      }
    }

    const overlays = await this.selectOverlayRows(100)
    for (const row of overlays) {
      const dates = getTimeseriesDates(row.dates)

      if (!row.ticker?.trim()) {
        anomalies.push({
          id: row.id,
          type: 'overlay',
          label: `- · ${row.keyword_name ?? '-'}`,
          reason: '티커 값 없음',
          detail: `${row.region ?? '-'} / ${row.search_type ?? '-'} · ${dates.pointCount}개`,
        })
        continue
      }

      if (dates.pointCount === 0) {
        anomalies.push({
          id: row.id,
          type: 'overlay',
          label: `${row.ticker} · ${row.keyword_name ?? '-'}`,
          reason: '주가 데이터 없음',
          detail: `${row.region ?? '-'} / ${row.search_type ?? '-'} · ${dates.pointCount}개`,
        })
      }
    }

    return anomalies.slice(0, 30)
  }

  private async getCount(table: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM ${table}`
    )

    return Number(result.rows[0]?.count ?? 0)
  }

  private async selectOverlayRows(limit = 20): Promise<OverlayRow[]> {
    const result = await this.pool.query<OverlayRow>(
      `
      SELECT
        kso.id,
        kso.ticker,
        kso.company_name,
        k.name AS keyword_name,
        ka.region,
        ka.period,
        ka.search_type,
        kso.created_at,
        kso.last_refreshed_at,
        COALESCE(kso.last_refreshed_at, kso.created_at) AS recent_at,
        COALESCE(array_agg(oct.date::text ORDER BY oct.date ASC) FILTER (WHERE oct.id IS NOT NULL), ARRAY[]::text[]) AS dates
      FROM keyword_stock_overlays kso
      INNER JOIN keyword_analysis ka ON ka.id = kso.analysis_id
      INNER JOIN keywords k ON k.id = ka.keyword_id
      LEFT JOIN overlay_chart_timeseries oct ON oct.overlay_id = kso.id
      GROUP BY kso.id, k.name, ka.region, ka.period, ka.search_type
      ORDER BY COALESCE(kso.last_refreshed_at, kso.created_at) DESC
      LIMIT $1
      `,
      [limit]
    )

    return result.rows
  }
}

function getTrendDates(
  trendsData: Array<{ date?: unknown }> | null | undefined
) {
  const dates = (trendsData ?? [])
    .map(point => point.date)
    .filter((date): date is string => typeof date === 'string')
    .sort((a, b) => a.localeCompare(b))

  return {
    pointCount: dates.length,
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
  }
}

function getTimeseriesDates(points: string[] | null | undefined) {
  const dates = (points ?? []).sort((a, b) => a.localeCompare(b))

  return {
    pointCount: dates.length,
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
  }
}

function toNullableIso(value: Date | string | null): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}
