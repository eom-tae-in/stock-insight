import type pg from 'pg'
import { normalizeKeywordSpacing } from '@/lib/utils/keyword-normalization'
import type {
  KeywordAnalysisOverlay,
  KeywordAnalysisSummary,
  KeywordRecord,
  KeywordStockOverlay,
  Period,
  Region,
  SearchType,
  TrendsDataPoint,
} from '@/types/database'
import type { KeywordRepository } from './keyword-repository'

type KeywordRow = {
  id: string
  user_id: string
  name: string
  normalized_name: string | null
  created_at: Date | string
  display_order: number | null
}

type KeywordAnalysisRow = {
  id: string
  keyword_id: string
  region: Region
  period: Period
  search_type: SearchType
  trends_data: TrendsDataPoint[] | null
  display_order: number | null
  created_at: Date | string
  updated_at: Date | string | null
}

type KeywordOverlayRow = {
  analysis_id: string
  id: string
  ticker: string
  company_name: string
  display_order: number
  created_at: Date | string
  last_refreshed_at: Date | string | null
  chart_data: Array<{
    date: string
    normalizedPrice: number | null
    rawPrice: number | null
  }> | null
}

export class PostgresKeywordRepository implements KeywordRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findManyByUserId(userId: string): Promise<KeywordRecord[]> {
    const keywordResult = await this.pool.query<KeywordRow>(
      `
      SELECT id, user_id, name, normalized_name, created_at, display_order
      FROM keywords
      WHERE user_id = $1
      ORDER BY display_order ASC, created_at DESC
      `,
      [userId]
    )

    return this.toKeywordRecords(keywordResult.rows)
  }

  async findById(
    userId: string,
    keywordId: string
  ): Promise<KeywordRecord | null> {
    const keywordResult = await this.pool.query<KeywordRow>(
      `
      SELECT id, user_id, name, normalized_name, created_at, display_order
      FROM keywords
      WHERE id = $1 AND user_id = $2
      `,
      [keywordId, userId]
    )

    const keyword = keywordResult.rows[0]
    if (!keyword) return null

    const records = await this.toKeywordRecords([keyword])
    return records[0] ?? null
  }

  async upsert(userId: string, keyword: string): Promise<KeywordRecord> {
    const normalizedKeyword = normalizeKeywordSpacing(keyword)

    if (!normalizedKeyword) {
      throw new Error('KEYWORD_REQUIRED')
    }

    const existingResult = await this.pool.query<KeywordRow>(
      `
      SELECT id, user_id, name, normalized_name, created_at, display_order
      FROM keywords
      WHERE user_id = $1 AND normalized_name = $2
      `,
      [userId, normalizedKeyword]
    )

    const existing = existingResult.rows[0]
    if (existing) return toKeywordRecord(existing)

    const createdResult = await this.pool.query<KeywordRow>(
      `
      WITH next_order AS (
        SELECT COALESCE(MAX(display_order), 0) + 1 AS display_order
        FROM keywords
        WHERE user_id = $1
      )
      INSERT INTO keywords (user_id, name, normalized_name, display_order)
      SELECT $1, $2, $2, display_order
      FROM next_order
      RETURNING id, user_id, name, normalized_name, created_at, display_order
      `,
      [userId, normalizedKeyword]
    )

    return toKeywordRecord(createdResult.rows[0])
  }

  async updateName(
    userId: string,
    keywordId: string,
    keyword: string
  ): Promise<KeywordRecord | null> {
    const normalizedKeyword = normalizeKeywordSpacing(keyword)

    if (!normalizedKeyword) {
      throw new Error('KEYWORD_REQUIRED')
    }

    const result = await this.pool.query<KeywordRow>(
      `
      UPDATE keywords
      SET name = $3,
          normalized_name = $3
      WHERE id = $1 AND user_id = $2
      RETURNING id, user_id, name, normalized_name, created_at, display_order
      `,
      [keywordId, userId, normalizedKeyword]
    )

    const updated = result.rows[0]
    return updated ? toKeywordRecord(updated) : null
  }

  async reorder(userId: string, orderedIds: string[]): Promise<void> {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new Error('INVALID_ORDER')
    }

    const uniqueIds = Array.from(new Set(orderedIds))
    if (uniqueIds.length !== orderedIds.length) {
      throw new Error('DUPLICATE_KEYWORD_ID')
    }

    const ownedResult = await this.pool.query<{ id: string }>(
      `
      SELECT id
      FROM keywords
      WHERE user_id = $1 AND id = ANY($2::uuid[])
      `,
      [userId, orderedIds]
    )

    if (ownedResult.rows.length !== orderedIds.length) {
      throw new Error('KEYWORD_OWNERSHIP_MISMATCH')
    }

    await this.pool.query('BEGIN')
    try {
      for (let index = 0; index < orderedIds.length; index++) {
        await this.pool.query(
          `
          UPDATE keywords
          SET display_order = $3
          WHERE id = $1 AND user_id = $2
          `,
          [orderedIds[index], userId, index + 1]
        )
      }
      await this.pool.query('COMMIT')
    } catch (error) {
      await this.pool.query('ROLLBACK')
      throw error
    }
  }

  async deleteById(userId: string, keywordId: string): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(
      `
      DELETE FROM keywords
      WHERE id = $1 AND user_id = $2
      RETURNING id
      `,
      [keywordId, userId]
    )

    return (result.rowCount ?? 0) > 0
  }

  private async toKeywordRecords(rows: KeywordRow[]): Promise<KeywordRecord[]> {
    if (rows.length === 0) return []

    const keywordIds = rows.map(row => row.id)
    const analyses = await this.findAnalysesByKeywordIds(keywordIds)
    const analysisIds = analyses.map(analysis => analysis.id)
    const overlays = await this.findOverlaysByAnalysisIds(analysisIds)
    const analysesByKeywordId = groupBy(
      analyses,
      analysis => analysis.keyword_id
    )
    const overlaysByAnalysisId = groupBy(
      overlays,
      overlay => overlay.analysis_id
    )
    const keywordIdByAnalysisId = new Map(
      analyses.map(analysis => [analysis.id, analysis.keyword_id])
    )
    const overlaysByKeywordId = new Map<string, KeywordStockOverlay[]>()

    for (const overlay of overlays) {
      const keywordId = keywordIdByAnalysisId.get(overlay.analysis_id)
      if (!keywordId) continue

      const current = overlaysByKeywordId.get(keywordId) ?? []
      current.push(toKeywordStockOverlay(overlay))
      overlaysByKeywordId.set(keywordId, current)
    }

    return rows.map(row =>
      toKeywordRecord(
        row,
        getLatestAnalysisTimestamp(analysesByKeywordId.get(row.id) ?? []),
        dedupeOverlaysByTicker(overlaysByKeywordId.get(row.id) ?? []),
        toAnalysisSummaries(
          analysesByKeywordId.get(row.id) ?? [],
          overlaysByAnalysisId
        )
      )
    )
  }

  private async findAnalysesByKeywordIds(
    keywordIds: string[]
  ): Promise<KeywordAnalysisRow[]> {
    if (keywordIds.length === 0) return []

    const result = await this.pool.query<KeywordAnalysisRow>(
      `
      SELECT
        id,
        keyword_id,
        region,
        period,
        search_type,
        trends_data,
        display_order,
        created_at,
        updated_at
      FROM keyword_analysis
      WHERE keyword_id = ANY($1::uuid[])
      ORDER BY display_order ASC, updated_at DESC NULLS LAST, created_at DESC
      `,
      [keywordIds]
    )

    return result.rows
  }

  private async findOverlaysByAnalysisIds(
    analysisIds: string[]
  ): Promise<KeywordOverlayRow[]> {
    if (analysisIds.length === 0) return []

    const result = await this.pool.query<KeywordOverlayRow>(
      `
      SELECT
        kso.analysis_id,
        kso.id,
        kso.ticker,
        kso.company_name,
        kso.display_order,
        kso.created_at,
        kso.last_refreshed_at,
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
      WHERE kso.analysis_id = ANY($1::uuid[])
      GROUP BY kso.id
      ORDER BY kso.display_order ASC, kso.created_at DESC
      `,
      [analysisIds]
    )

    return result.rows
  }
}

function toKeywordRecord(
  row: KeywordRow,
  refreshedAt?: string | null,
  overlays: KeywordStockOverlay[] = [],
  analyses: KeywordAnalysisSummary[] = []
): KeywordRecord {
  const createdAt = toIsoString(row.created_at)
  const displayDate = refreshedAt ?? createdAt

  return {
    id: row.id,
    user_id: row.user_id,
    keyword: row.name,
    normalized_keyword: row.normalized_name ?? row.name,
    region: 'GLOBAL',
    search_type: 'WEB',
    trends_data: [],
    searched_at: displayDate,
    created_at: createdAt,
    updated_at: displayDate,
    display_order: row.display_order ?? 0,
    last_viewed_at: null,
    overlays,
    analyses,
  }
}

function toKeywordStockOverlay(
  overlay: KeywordOverlayRow
): KeywordStockOverlay {
  return {
    id: overlay.id,
    analysis_id: overlay.analysis_id,
    ticker: overlay.ticker,
    company_name: overlay.company_name,
    display_order: overlay.display_order,
    created_at: toIsoString(overlay.created_at),
    last_refreshed_at: overlay.last_refreshed_at
      ? toIsoString(overlay.last_refreshed_at)
      : null,
    lastRefreshedAt: overlay.last_refreshed_at
      ? toIsoString(overlay.last_refreshed_at)
      : null,
    chart_data: overlay.chart_data ?? [],
  }
}

function toKeywordAnalysisOverlay(
  overlay: KeywordOverlayRow
): KeywordAnalysisOverlay {
  return {
    ...toKeywordStockOverlay(overlay),
    analysis_id: overlay.analysis_id,
    chart_data: overlay.chart_data ?? [],
  }
}

function toAnalysisSummaries(
  analyses: KeywordAnalysisRow[],
  overlaysByAnalysisId: Map<string, KeywordOverlayRow[]>
): KeywordAnalysisSummary[] {
  return analyses
    .filter(analysis => analysis.period === '5Y')
    .sort(
      (a, b) =>
        (a.display_order ?? 0) - (b.display_order ?? 0) ||
        new Date(toIsoString(b.updated_at ?? b.created_at)).getTime() -
          new Date(toIsoString(a.updated_at ?? a.created_at)).getTime()
    )
    .map(analysis => ({
      id: analysis.id,
      keyword_id: analysis.keyword_id,
      region: analysis.region,
      period: analysis.period,
      search_type: analysis.search_type,
      trends_data: analysis.trends_data ?? [],
      overlays: (overlaysByAnalysisId.get(analysis.id) ?? []).map(
        toKeywordAnalysisOverlay
      ),
      display_order: analysis.display_order ?? 0,
      created_at: toIsoString(analysis.created_at),
      updated_at: analysis.updated_at
        ? toIsoString(analysis.updated_at)
        : undefined,
    }))
}

function getLatestAnalysisTimestamp(
  analyses: KeywordAnalysisRow[]
): string | null {
  if (analyses.length === 0) return null

  return analyses.reduce<string | null>((latest, analysis) => {
    const current = toIsoString(analysis.updated_at ?? analysis.created_at)
    if (!latest) return current
    return new Date(current).getTime() > new Date(latest).getTime()
      ? current
      : latest
  }, null)
}

function dedupeOverlaysByTicker(
  overlays: KeywordStockOverlay[]
): KeywordStockOverlay[] {
  const uniqueByTicker = new Map<string, KeywordStockOverlay>()

  for (const overlay of overlays) {
    const normalizedTicker = overlay.ticker.trim().toUpperCase()
    if (!normalizedTicker || uniqueByTicker.has(normalizedTicker)) continue

    uniqueByTicker.set(normalizedTicker, {
      ...overlay,
      ticker: normalizedTicker,
    })
  }

  return Array.from(uniqueByTicker.values()).sort(
    (a, b) =>
      a.display_order - b.display_order || a.ticker.localeCompare(b.ticker)
  )
}

function groupBy<T>(
  values: T[],
  getKey: (value: T) => string
): Map<string, T[]> {
  const grouped = new Map<string, T[]>()

  for (const value of values) {
    const key = getKey(value)
    const current = grouped.get(key) ?? []
    current.push(value)
    grouped.set(key, current)
  }

  return grouped
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}
