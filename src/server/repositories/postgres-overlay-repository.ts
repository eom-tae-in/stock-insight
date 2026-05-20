import type pg from 'pg'
import type {
  KeywordAnalysisOverlay,
  Period,
  Region,
  SearchType,
} from '@/types/database'
import type {
  AnalysisFilterSnapshot,
  OverlayOrderRecord,
  OverlayRepository,
  OverlayTicker,
  OverlayTimeseriesRecord,
} from './overlay-repository'

type OverlayRow = {
  id: string
  analysis_id: string
  ticker: string
  company_name: string
  display_order: number
  last_refreshed_at: Date | string | null
  created_at: Date | string
  chart_data: Array<{
    date: string
    normalizedPrice: string | number | null
    rawPrice: string | number | null
  }> | null
}

export class PostgresOverlayRepository implements OverlayRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findOwnedAnalysisFilters(
    userId: string,
    analysisId: string
  ): Promise<AnalysisFilterSnapshot | null> {
    const result = await this.pool.query<{
      region: Region
      period: Period
      search_type: SearchType
    }>(
      `
      SELECT ka.region, ka.period, ka.search_type
      FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE ka.id = $1 AND k.user_id = $2
      `,
      [analysisId, userId]
    )

    return result.rows[0] ?? null
  }

  async findManyByAnalysisId(
    userId: string,
    analysisId: string
  ): Promise<KeywordAnalysisOverlay[]> {
    const ownedAnalysis = await this.findOwnedAnalysisFilters(
      userId,
      analysisId
    )
    if (!ownedAnalysis) return []

    const result = await this.pool.query<OverlayRow>(
      `
      SELECT
        kso.id,
        kso.analysis_id,
        kso.ticker,
        kso.company_name,
        kso.display_order,
        kso.last_refreshed_at,
        kso.created_at,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'date', oct.date::text,
              'normalizedPrice', oct.normalized_price,
              'rawPrice', oct.raw_price
            )
            ORDER BY oct.date ASC
          ) FILTER (WHERE oct.id IS NOT NULL),
          '[]'::jsonb
        ) AS chart_data
      FROM keyword_stock_overlays kso
      LEFT JOIN overlay_chart_timeseries oct ON oct.overlay_id = kso.id
      WHERE kso.analysis_id = $1
      GROUP BY kso.id
      ORDER BY kso.display_order ASC, kso.created_at DESC
      `,
      [analysisId]
    )

    return result.rows.map(toOverlay)
  }

  async create(input: {
    analysisId: string
    ticker: string
    companyName: string
    displayOrder?: number
  }): Promise<string> {
    try {
      const result = await this.pool.query<{ id: string }>(
        `
        WITH next_order AS (
          SELECT COALESCE(MAX(display_order), 0) + 1 AS display_order
          FROM keyword_stock_overlays
          WHERE analysis_id = $1
        )
        INSERT INTO keyword_stock_overlays (
          analysis_id,
          ticker,
          company_name,
          display_order
        )
        SELECT $1, $2, $3, COALESCE($4::integer, display_order)
        FROM next_order
        RETURNING id
        `,
        [
          input.analysisId,
          input.ticker,
          input.companyName,
          input.displayOrder ?? null,
        ]
      )

      return result.rows[0].id
    } catch (error) {
      if (isUniqueViolation(error)) throw new Error('DUPLICATE_OVERLAY')
      throw error
    }
  }

  async insertTimeseries(records: OverlayTimeseriesRecord[]): Promise<void> {
    if (records.length === 0) return

    await this.pool.query('BEGIN')
    try {
      for (const record of records) {
        await this.pool.query(
          `
          INSERT INTO overlay_chart_timeseries (
            overlay_id,
            date,
            raw_price,
            normalized_price
          )
          VALUES ($1, $2, $3, $4)
          `,
          [
            record.overlay_id,
            record.date,
            record.raw_price,
            record.normalized_price,
          ]
        )
      }
      await this.pool.query('COMMIT')
    } catch (error) {
      await this.pool.query('ROLLBACK')
      throw error
    }
  }

  async updateOrder(
    analysisId: string,
    overlays: OverlayOrderRecord[]
  ): Promise<void> {
    await this.pool.query('BEGIN')
    try {
      for (const overlay of overlays) {
        await this.pool.query(
          `
          UPDATE keyword_stock_overlays
          SET display_order = $3
          WHERE id = $1 AND analysis_id = $2
          `,
          [overlay.id, analysisId, overlay.display_order]
        )
      }
      await this.pool.query('COMMIT')
    } catch (error) {
      await this.pool.query('ROLLBACK')
      throw error
    }
  }

  async deleteById(analysisId: string, overlayId: string): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(
      `
      DELETE FROM keyword_stock_overlays
      WHERE id = $1 AND analysis_id = $2
      RETURNING id
      `,
      [overlayId, analysisId]
    )

    return (result.rowCount ?? 0) > 0
  }

  async findTickerById(
    analysisId: string,
    overlayId: string
  ): Promise<OverlayTicker | null> {
    const result = await this.pool.query<OverlayTicker>(
      `
      SELECT id, ticker
      FROM keyword_stock_overlays
      WHERE id = $1 AND analysis_id = $2
      `,
      [overlayId, analysisId]
    )

    return result.rows[0] ?? null
  }

  async refreshTimeseries(input: {
    analysisId: string
    overlayId: string
    records: OverlayTimeseriesRecord[]
    pruneBeforeDate?: string
  }): Promise<void> {
    await this.pool.query('BEGIN')
    try {
      if (input.pruneBeforeDate) {
        await this.pool.query(
          `
          DELETE FROM overlay_chart_timeseries
          WHERE overlay_id = $1 AND date < $2
          `,
          [input.overlayId, input.pruneBeforeDate]
        )
      }

      for (const record of input.records) {
        await this.pool.query(
          `
          INSERT INTO overlay_chart_timeseries (
            overlay_id,
            date,
            raw_price,
            normalized_price
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (overlay_id, date)
          DO UPDATE SET
            raw_price = EXCLUDED.raw_price,
            normalized_price = EXCLUDED.normalized_price
          `,
          [
            record.overlay_id,
            record.date,
            record.raw_price,
            record.normalized_price,
          ]
        )
      }

      await this.pool.query(
        `
        UPDATE keyword_stock_overlays
        SET last_refreshed_at = now()
        WHERE id = $1 AND analysis_id = $2
        `,
        [input.overlayId, input.analysisId]
      )
      await this.pool.query('COMMIT')
    } catch (error) {
      await this.pool.query('ROLLBACK')
      throw error
    }
  }
}

function toOverlay(row: OverlayRow): KeywordAnalysisOverlay {
  return {
    id: row.id,
    analysis_id: row.analysis_id,
    ticker: row.ticker,
    company_name: row.company_name,
    display_order: row.display_order,
    last_refreshed_at: row.last_refreshed_at
      ? toIsoString(row.last_refreshed_at)
      : null,
    lastRefreshedAt: row.last_refreshed_at
      ? toIsoString(row.last_refreshed_at)
      : null,
    created_at: toIsoString(row.created_at),
    chart_data: (row.chart_data ?? []).map(point => ({
      date: point.date,
      normalizedPrice: toNullableNumber(point.normalizedPrice),
      rawPrice: toNullableNumber(point.rawPrice),
    })),
  }
}

function toNullableNumber(value: string | number | null): number | null {
  if (value === null) return null
  return typeof value === 'number' ? value : Number(value)
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  )
}
