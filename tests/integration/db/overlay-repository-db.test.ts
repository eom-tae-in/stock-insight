import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type pg from 'pg'
import { PostgresOverlayRepository } from '@/server/repositories/postgres-overlay-repository'
import type { OverlayRepository } from '@/server/repositories/overlay-repository'
import {
  startPostgresTestDatabase,
  type PostgresTestDatabase,
} from './setup-postgres'

const userId = '00000000-0000-0000-0000-000000000301'
const otherUserId = '00000000-0000-0000-0000-000000000302'

let database: PostgresTestDatabase
let pool: pg.Pool
let repository: OverlayRepository

describe('PostgresOverlayRepository integration', () => {
  beforeAll(async () => {
    database = await startPostgresTestDatabase()
    pool = database.pool
    repository = new PostgresOverlayRepository(pool)
  })

  afterAll(async () => {
    await database?.stop()
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE keywords CASCADE')
  })

  it('finds analysis filters only when the current user owns the analysis', async () => {
    const analysisId = await insertAnalysis(userId, 'AI chips')

    await expect(
      repository.findOwnedAnalysisFilters(userId, analysisId)
    ).resolves.toEqual({
      region: 'GLOBAL',
      period: '5Y',
      search_type: 'WEB',
    })
    await expect(
      repository.findOwnedAnalysisFilters(otherUserId, analysisId)
    ).resolves.toBeNull()
  })

  it('creates overlays with next display order and rejects duplicate tickers', async () => {
    const analysisId = await insertAnalysis(userId, 'Robotics')

    const firstId = await repository.create({
      analysisId,
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
    })
    const secondId = await repository.create({
      analysisId,
      ticker: 'MSFT',
      companyName: 'Microsoft',
    })

    await expect(
      repository.create({
        analysisId,
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
      })
    ).rejects.toThrow('DUPLICATE_OVERLAY')

    const rows = await pool.query<{ id: string; display_order: number }>(
      `
      SELECT id, display_order
      FROM keyword_stock_overlays
      WHERE id = ANY($1::uuid[])
      ORDER BY display_order ASC
      `,
      [[firstId, secondId]]
    )

    expect(rows.rows).toEqual([
      { id: firstId, display_order: 1 },
      { id: secondId, display_order: 2 },
    ])
  })

  it('stores and lists overlay timeseries in chart order', async () => {
    const analysisId = await insertAnalysis(userId, 'Battery')
    const overlayId = await repository.create({
      analysisId,
      ticker: 'TSLA',
      companyName: 'Tesla',
    })

    await repository.insertTimeseries([
      {
        overlay_id: overlayId,
        date: '2026-01-08',
        raw_price: 120,
        normalized_price: 100,
      },
      {
        overlay_id: overlayId,
        date: '2026-01-01',
        raw_price: 100,
        normalized_price: 0,
      },
    ])

    const overlays = await repository.findManyByAnalysisId(userId, analysisId)

    expect(overlays).toHaveLength(1)
    expect(overlays[0]).toMatchObject({
      id: overlayId,
      analysis_id: analysisId,
      ticker: 'TSLA',
      company_name: 'Tesla',
      display_order: 1,
    })
    expect(overlays[0].chart_data).toEqual([
      { date: '2026-01-01', rawPrice: 100, normalizedPrice: 0 },
      { date: '2026-01-08', rawPrice: 120, normalizedPrice: 100 },
    ])
  })

  it('ignores empty timeseries inserts without touching existing rows', async () => {
    const analysisId = await insertAnalysis(userId, 'Empty insert')
    const overlayId = await repository.create({
      analysisId,
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
    })

    await expect(repository.insertTimeseries([])).resolves.toBeUndefined()

    const rows = await pool.query(
      'SELECT id FROM overlay_chart_timeseries WHERE overlay_id = $1',
      [overlayId]
    )
    expect(rows.rowCount).toBe(0)
  })

  it('updates overlay order and deletes only overlays under the target analysis', async () => {
    const analysisId = await insertAnalysis(userId, 'Cloud')
    const otherAnalysisId = await insertAnalysis(userId, 'Semiconductor', 'US')
    const firstId = await repository.create({
      analysisId,
      ticker: 'AMZN',
      companyName: 'Amazon',
    })
    const secondId = await repository.create({
      analysisId,
      ticker: 'MSFT',
      companyName: 'Microsoft',
    })
    const otherOverlayId = await repository.create({
      analysisId: otherAnalysisId,
      ticker: 'NVDA',
      companyName: 'Nvidia',
    })

    await repository.updateOrder(analysisId, [
      { id: secondId, display_order: 1 },
      { id: firstId, display_order: 2 },
      { id: otherOverlayId, display_order: 3 },
    ])

    const overlays = await repository.findManyByAnalysisId(userId, analysisId)
    expect(overlays.map(overlay => overlay.id)).toEqual([secondId, firstId])

    await expect(
      repository.deleteById(analysisId, otherOverlayId)
    ).resolves.toBe(false)
    await expect(repository.deleteById(analysisId, firstId)).resolves.toBe(true)
  })

  it('refreshes timeseries by pruning old rows, upserting new rows, and marking refresh time', async () => {
    const analysisId = await insertAnalysis(userId, 'Refresh')
    const overlayId = await repository.create({
      analysisId,
      ticker: 'NFLX',
      companyName: 'Netflix',
    })
    await repository.insertTimeseries([
      {
        overlay_id: overlayId,
        date: '2025-12-25',
        raw_price: 90,
        normalized_price: 0,
      },
      {
        overlay_id: overlayId,
        date: '2026-01-01',
        raw_price: 100,
        normalized_price: 50,
      },
    ])

    await repository.refreshTimeseries({
      analysisId,
      overlayId,
      pruneBeforeDate: '2026-01-01',
      records: [
        {
          overlay_id: overlayId,
          date: '2026-01-01',
          raw_price: 110,
          normalized_price: 0,
        },
        {
          overlay_id: overlayId,
          date: '2026-01-08',
          raw_price: 130,
          normalized_price: 100,
        },
      ],
    })

    const rows = await pool.query<{
      date: string
      raw_price: string
      normalized_price: string
    }>(
      `
      SELECT date::text, raw_price, normalized_price
      FROM overlay_chart_timeseries
      WHERE overlay_id = $1
      ORDER BY date ASC
      `,
      [overlayId]
    )
    const overlay = await repository.findTickerById(analysisId, overlayId)
    const refreshed = await pool.query<{ last_refreshed_at: Date | null }>(
      `
      SELECT last_refreshed_at
      FROM keyword_stock_overlays
      WHERE id = $1
      `,
      [overlayId]
    )

    expect(overlay).toEqual({ id: overlayId, ticker: 'NFLX' })
    expect(rows.rows).toEqual([
      { date: '2026-01-01', raw_price: '110', normalized_price: '0' },
      { date: '2026-01-08', raw_price: '130', normalized_price: '100' },
    ])
    expect(refreshed.rows[0].last_refreshed_at).toBeInstanceOf(Date)
  })

  it('refreshes timeseries without pruning when no prune date is provided', async () => {
    const analysisId = await insertAnalysis(userId, 'No prune refresh')
    const overlayId = await repository.create({
      analysisId,
      ticker: 'META',
      companyName: 'Meta',
    })
    await repository.insertTimeseries([
      {
        overlay_id: overlayId,
        date: '2025-12-25',
        raw_price: 90,
        normalized_price: 0,
      },
    ])

    await repository.refreshTimeseries({
      analysisId,
      overlayId,
      records: [
        {
          overlay_id: overlayId,
          date: '2026-01-01',
          raw_price: 100,
          normalized_price: 100,
        },
      ],
    })

    const rows = await pool.query<{ date: string }>(
      `
      SELECT date::text
      FROM overlay_chart_timeseries
      WHERE overlay_id = $1
      ORDER BY date ASC
      `,
      [overlayId]
    )

    expect(rows.rows).toEqual([{ date: '2025-12-25' }, { date: '2026-01-01' }])
  })
})

async function insertAnalysis(
  userId: string,
  keyword: string,
  region = 'GLOBAL'
): Promise<string> {
  const keywordResult = await pool.query<{ id: string }>(
    `
    INSERT INTO keywords (user_id, name, normalized_name, display_order)
    VALUES ($1, $2, $2, 1)
    RETURNING id
    `,
    [userId, keyword]
  )
  const analysisResult = await pool.query<{ id: string }>(
    `
    INSERT INTO keyword_analysis (
      keyword_id,
      region,
      period,
      search_type,
      trends_data,
      display_order
    )
    VALUES ($1, $2, '5Y', 'WEB', '[]'::jsonb, 1)
    RETURNING id
    `,
    [keywordResult.rows[0].id, region]
  )

  return analysisResult.rows[0].id
}
