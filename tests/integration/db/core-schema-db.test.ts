import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type pg from 'pg'
import {
  startPostgresTestDatabase,
  type PostgresTestDatabase,
} from './setup-postgres'

const userA = '00000000-0000-0000-0000-000000000001'
const userB = '00000000-0000-0000-0000-000000000002'

let database: PostgresTestDatabase
let pool: pg.Pool

async function createKeyword({
  userId = userA,
  name,
  displayOrder = 1,
}: {
  userId?: string
  name: string
  displayOrder?: number
}) {
  const result = await pool.query<{ id: string }>(
    `
    INSERT INTO keywords (user_id, name, normalized_name, display_order)
    VALUES ($1, $2, $2, $3)
    RETURNING id
    `,
    [userId, name, displayOrder]
  )

  return result.rows[0].id
}

async function createAnalysis({
  keywordId,
  region = 'GLOBAL',
  period = '5Y',
  searchType = 'WEB',
  displayOrder = 1,
}: {
  keywordId: string
  region?: string
  period?: string
  searchType?: string
  displayOrder?: number
}) {
  const result = await pool.query<{ id: string }>(
    `
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
    VALUES (
      $1,
      $2,
      $3,
      $4,
      '[{"date":"2026-01-01","value":50,"ma13Value":48,"yoyValue":12}]'::jsonb,
      48,
      12,
      $5
    )
    RETURNING id
    `,
    [keywordId, region, period, searchType, displayOrder]
  )

  return result.rows[0].id
}

async function createOverlay({
  analysisId,
  ticker,
  displayOrder = 1,
}: {
  analysisId: string
  ticker: string
  displayOrder?: number
}) {
  const result = await pool.query<{ id: string }>(
    `
    INSERT INTO keyword_stock_overlays (
      analysis_id,
      ticker,
      company_name,
      display_order
    )
    VALUES ($1, $2, $3, $4)
    RETURNING id
    `,
    [analysisId, ticker, `${ticker} Inc.`, displayOrder]
  )

  return result.rows[0].id
}

describe('PostgreSQL schema integration', () => {
  beforeAll(async () => {
    database = await startPostgresTestDatabase()
    pool = database.pool
  })

  afterAll(async () => {
    await database?.stop()
  })

  describe('keywords', () => {
    it('stores keywords per user and returns them in display order', async () => {
      await createKeyword({ name: 'Battery', displayOrder: 2 })
      await createKeyword({ name: 'AI', displayOrder: 1 })
      await createKeyword({
        userId: userB,
        name: 'Semiconductor',
        displayOrder: 1,
      })

      const result = await pool.query<{ name: string }>(
        `
        SELECT name
        FROM keywords
        WHERE user_id = $1
        ORDER BY display_order ASC, created_at DESC
        `,
        [userA]
      )

      expect(result.rows).toEqual([{ name: 'AI' }, { name: 'Battery' }])
    })

    it('prevents duplicate normalized keyword names for the same user', async () => {
      await createKeyword({ name: 'AI chips' })

      await expect(createKeyword({ name: 'AI chips' })).rejects.toMatchObject({
        code: '23505',
      })
      await expect(
        createKeyword({ userId: userB, name: 'AI chips' })
      ).resolves.toEqual(expect.any(String))
    })
  })

  describe('keyword_analysis', () => {
    it('stores one analysis per keyword/filter combination', async () => {
      const keywordId = await createKeyword({ name: 'Robotics' })
      await createAnalysis({ keywordId, region: 'GLOBAL', searchType: 'WEB' })

      await expect(
        createAnalysis({ keywordId, region: 'GLOBAL', searchType: 'WEB' })
      ).rejects.toMatchObject({
        code: '23505',
      })
      await expect(
        createAnalysis({ keywordId, region: 'US', searchType: 'WEB' })
      ).resolves.toEqual(expect.any(String))
    })

    it('deletes analyses when the parent keyword is deleted', async () => {
      const keywordId = await createKeyword({ name: 'Cloud computing' })
      const analysisId = await createAnalysis({ keywordId })

      await pool.query('DELETE FROM keywords WHERE id = $1', [keywordId])

      const result = await pool.query(
        'SELECT id FROM keyword_analysis WHERE id = $1',
        [analysisId]
      )

      expect(result.rowCount).toBe(0)
    })
  })

  describe('keyword_stock_overlays and overlay_chart_timeseries', () => {
    it('stores overlays and timeseries points in chart date order', async () => {
      const keywordId = await createKeyword({ name: 'AI infrastructure' })
      const analysisId = await createAnalysis({ keywordId })
      const overlayId = await createOverlay({ analysisId, ticker: 'AAPL' })

      await pool.query(
        `
        INSERT INTO overlay_chart_timeseries (
          overlay_id,
          date,
          normalized_price,
          raw_price
        )
        VALUES
          ($1, '2026-01-08', 100, 120),
          ($1, '2026-01-01', 0, 100)
        `,
        [overlayId]
      )

      const result = await pool.query<{
        ticker: string
        date: string
        normalized_price: string
        raw_price: string
      }>(
        `
        SELECT
          kso.ticker,
          oct.date::text,
          oct.normalized_price::text,
          oct.raw_price::text
        FROM keyword_stock_overlays kso
        INNER JOIN overlay_chart_timeseries oct
          ON oct.overlay_id = kso.id
        WHERE kso.id = $1
        ORDER BY oct.date ASC
        `,
        [overlayId]
      )

      expect(result.rows).toEqual([
        {
          ticker: 'AAPL',
          date: '2026-01-01',
          normalized_price: '0',
          raw_price: '100',
        },
        {
          ticker: 'AAPL',
          date: '2026-01-08',
          normalized_price: '100',
          raw_price: '120',
        },
      ])
    })

    it('prevents duplicate tickers per analysis and cascades timeseries deletes', async () => {
      const keywordId = await createKeyword({ name: 'Electric vehicles' })
      const analysisId = await createAnalysis({ keywordId })
      const overlayId = await createOverlay({ analysisId, ticker: 'TSLA' })

      await pool.query(
        `
        INSERT INTO overlay_chart_timeseries (
          overlay_id,
          date,
          normalized_price,
          raw_price
        )
        VALUES ($1, '2026-01-01', 50, 200)
        `,
        [overlayId]
      )

      await expect(
        createOverlay({ analysisId, ticker: 'TSLA' })
      ).rejects.toMatchObject({
        code: '23505',
      })

      await pool.query('DELETE FROM keyword_stock_overlays WHERE id = $1', [
        overlayId,
      ])
      const result = await pool.query(
        'SELECT id FROM overlay_chart_timeseries WHERE overlay_id = $1',
        [overlayId]
      )

      expect(result.rowCount).toBe(0)
    })
  })
})
