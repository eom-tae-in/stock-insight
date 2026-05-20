import type pg from 'pg'
import type {
  KeywordAnalysis,
  Period,
  Region,
  SearchType,
  TrendsDataPoint,
} from '@/types/database'
import type {
  AnalysisCreateData,
  AnalysisRepository,
  AnalysisUpdateData,
  OwnedAnalysisWithKeyword,
} from './analysis-repository'

type AnalysisRow = {
  id: string
  keyword_id: string
  region: Region
  period: Period
  search_type: SearchType
  trends_data: TrendsDataPoint[] | null
  ma13_data: string | number | null
  yoy_data: string | number | null
  display_order: number | null
  created_at: Date | string
  updated_at: Date | string | null
}

type AnalysisWithKeywordRow = AnalysisRow & {
  keyword_name: string
}

export class PostgresAnalysisRepository implements AnalysisRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findByFilters(
    userId: string,
    keywordId: string,
    region: Region,
    period: Period,
    searchType: SearchType
  ): Promise<KeywordAnalysis | null> {
    const result = await this.pool.query<AnalysisRow>(
      `
      SELECT
        ka.id,
        ka.keyword_id,
        ka.region,
        ka.period,
        ka.search_type,
        ka.trends_data,
        ka.ma13_data,
        ka.yoy_data,
        ka.display_order,
        ka.created_at,
        ka.updated_at
      FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE
        ka.keyword_id = $1
        AND k.user_id = $2
        AND ka.region = $3
        AND ka.period = $4
        AND ka.search_type = $5
      `,
      [keywordId, userId, region, period, searchType]
    )

    return result.rows[0] ? toAnalysis(result.rows[0]) : null
  }

  async findManyByKeywordId(
    userId: string,
    keywordId: string
  ): Promise<KeywordAnalysis[]> {
    const result = await this.pool.query<AnalysisRow>(
      `
      SELECT
        ka.id,
        ka.keyword_id,
        ka.region,
        ka.period,
        ka.search_type,
        ka.trends_data,
        ka.ma13_data,
        ka.yoy_data,
        ka.display_order,
        ka.created_at,
        ka.updated_at
      FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE ka.keyword_id = $1 AND k.user_id = $2
      ORDER BY ka.display_order ASC, ka.updated_at DESC NULLS LAST, ka.created_at DESC
      `,
      [keywordId, userId]
    )

    return result.rows.map(toAnalysis)
  }

  async findOwnedById(
    userId: string,
    analysisId: string
  ): Promise<KeywordAnalysis | null> {
    const result = await this.pool.query<AnalysisRow>(
      `
      SELECT
        ka.id,
        ka.keyword_id,
        ka.region,
        ka.period,
        ka.search_type,
        ka.trends_data,
        ka.ma13_data,
        ka.yoy_data,
        ka.display_order,
        ka.created_at,
        ka.updated_at
      FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE ka.id = $1 AND k.user_id = $2
      `,
      [analysisId, userId]
    )

    return result.rows[0] ? toAnalysis(result.rows[0]) : null
  }

  async findOwnedWithKeyword(
    userId: string,
    analysisId: string
  ): Promise<OwnedAnalysisWithKeyword | null> {
    const result = await this.pool.query<AnalysisWithKeywordRow>(
      `
      SELECT
        ka.id,
        ka.keyword_id,
        ka.region,
        ka.period,
        ka.search_type,
        ka.trends_data,
        ka.ma13_data,
        ka.yoy_data,
        ka.display_order,
        ka.created_at,
        ka.updated_at,
        k.name AS keyword_name
      FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE ka.id = $1 AND k.user_id = $2
      `,
      [analysisId, userId]
    )

    const row = result.rows[0]
    if (!row) return null

    return {
      analysis: toAnalysis(row),
      keyword: row.keyword_name,
    }
  }

  async getOwnedKeywordName(
    userId: string,
    keywordId: string
  ): Promise<string | null> {
    const result = await this.pool.query<{ name: string }>(
      `
      SELECT name
      FROM keywords
      WHERE id = $1 AND user_id = $2
      `,
      [keywordId, userId]
    )

    return result.rows[0]?.name ?? null
  }

  async create(data: AnalysisCreateData): Promise<string> {
    const existingResult = await this.pool.query<{ id: string }>(
      `
      SELECT id
      FROM keyword_analysis
      WHERE keyword_id = $1 AND region = $2 AND period = $3 AND search_type = $4
      `,
      [data.keyword_id, data.region, data.period, data.search_type]
    )

    const existing = existingResult.rows[0]
    if (existing) {
      if (data.trends_data.length === 0) return existing.id

      await this.pool.query(
        `
        UPDATE keyword_analysis
        SET trends_data = $2,
            ma13_data = $3,
            yoy_data = $4,
            updated_at = now()
        WHERE id = $1
        `,
        [
          existing.id,
          JSON.stringify(data.trends_data),
          data.ma13_data ?? null,
          data.yoy_data ?? null,
        ]
      )

      return existing.id
    }

    const createdResult = await this.pool.query<{ id: string }>(
      `
      WITH keyword_owner AS (
        SELECT user_id
        FROM keywords
        WHERE id = $1
      ),
      next_order AS (
        SELECT COALESCE(MAX(ka.display_order), 0) + 1 AS display_order
        FROM keyword_analysis ka
        INNER JOIN keywords k ON k.id = ka.keyword_id
        WHERE k.user_id = (SELECT user_id FROM keyword_owner)
      )
      INSERT INTO keyword_analysis (
        keyword_id,
        region,
        period,
        search_type,
        trends_data,
        ma13_data,
        yoy_data,
        display_order
      )
      SELECT $1, $2, $3, $4, $5, $6, $7, display_order
      FROM next_order
      RETURNING id
      `,
      [
        data.keyword_id,
        data.region,
        data.period,
        data.search_type,
        JSON.stringify(data.trends_data),
        data.ma13_data ?? null,
        data.yoy_data ?? null,
      ]
    )

    return createdResult.rows[0].id
  }

  async update(analysisId: string, data: AnalysisUpdateData): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(
      `
      UPDATE keyword_analysis
      SET trends_data = CASE WHEN $2::boolean THEN $3::jsonb ELSE trends_data END,
          ma13_data = CASE WHEN $4::boolean THEN $5::numeric ELSE ma13_data END,
          yoy_data = CASE WHEN $6::boolean THEN $7::numeric ELSE yoy_data END,
          updated_at = now()
      WHERE id = $1
      RETURNING id
      `,
      [
        analysisId,
        data.trends_data !== undefined,
        data.trends_data === undefined
          ? null
          : JSON.stringify(data.trends_data),
        data.ma13_data !== undefined,
        data.ma13_data ?? null,
        data.yoy_data !== undefined,
        data.yoy_data ?? null,
      ]
    )

    return (result.rowCount ?? 0) > 0
  }

  async deleteById(analysisId: string): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(
      `
      DELETE FROM keyword_analysis
      WHERE id = $1
      RETURNING id
      `,
      [analysisId]
    )

    return (result.rowCount ?? 0) > 0
  }

  async reorder(userId: string, orderedIds: string[]): Promise<void> {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new Error('INVALID_ORDER')
    }

    const uniqueIds = Array.from(new Set(orderedIds))
    if (uniqueIds.length !== orderedIds.length) {
      throw new Error('DUPLICATE_ANALYSIS_ID')
    }

    const ownedResult = await this.pool.query<{ id: string }>(
      `
      SELECT ka.id
      FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE k.user_id = $1 AND ka.id = ANY($2::uuid[])
      `,
      [userId, orderedIds]
    )

    if (ownedResult.rows.length !== orderedIds.length) {
      throw new Error('ANALYSIS_OWNERSHIP_MISMATCH')
    }

    await this.pool.query('BEGIN')
    try {
      for (let index = 0; index < orderedIds.length; index++) {
        await this.pool.query(
          `
          UPDATE keyword_analysis
          SET display_order = $2
          WHERE id = $1
          `,
          [orderedIds[index], index + 1]
        )
      }
      await this.pool.query('COMMIT')
    } catch (error) {
      await this.pool.query('ROLLBACK')
      throw error
    }
  }
}

function toAnalysis(row: AnalysisRow): KeywordAnalysis {
  return {
    id: row.id,
    keyword_id: row.keyword_id,
    region: row.region,
    period: row.period,
    search_type: row.search_type,
    trends_data: row.trends_data ?? [],
    ma13_data: toOptionalNumber(row.ma13_data),
    yoy_data: toOptionalNumber(row.yoy_data),
    display_order: row.display_order ?? undefined,
    created_at: toIsoString(row.created_at),
    updated_at: row.updated_at ? toIsoString(row.updated_at) : undefined,
  }
}

function toOptionalNumber(value: string | number | null): number | undefined {
  if (value === null) return undefined
  return typeof value === 'number' ? value : Number(value)
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}
