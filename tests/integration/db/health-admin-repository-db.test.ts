import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type pg from 'pg'
import { PostgresAdminReportRepository } from '@/server/repositories/postgres-admin-report-repository'
import { PostgresHealthRepository } from '@/server/repositories/postgres-health-repository'
import type { AdminReportRepository } from '@/server/repositories/admin-report-repository'
import type { HealthRepository } from '@/server/repositories/health-repository'
import {
  startPostgresTestDatabase,
  type PostgresTestDatabase,
} from './setup-postgres'

const userId = '00000000-0000-0000-0000-000000000501'

let database: PostgresTestDatabase
let pool: pg.Pool
let healthRepository: HealthRepository
let adminRepository: AdminReportRepository

describe('Postgres health and admin report repositories integration', () => {
  beforeAll(async () => {
    database = await startPostgresTestDatabase()
    pool = database.pool
    healthRepository = new PostgresHealthRepository(pool)
    adminRepository = new PostgresAdminReportRepository(pool)
  })

  afterAll(async () => {
    await database?.stop()
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE keywords CASCADE')
  })

  it('checks database connectivity', async () => {
    await expect(healthRepository.checkDatabase()).resolves.toBeUndefined()
    await expect(adminRepository.checkDatabase()).resolves.toBeUndefined()
  })

  it('counts admin report metrics', async () => {
    const { analysisId } = await insertKeywordAnalysisOverlay()

    await pool.query(
      `
      INSERT INTO keyword_stock_overlays (
        analysis_id,
        ticker,
        company_name,
        display_order
      )
      VALUES ($1, 'MSFT', 'Microsoft', 2)
      `,
      [analysisId]
    )

    await expect(adminRepository.getUserCount('global')).resolves.toBeNull()
    await expect(adminRepository.getKeywordCount()).resolves.toBe(1)
    await expect(adminRepository.getAnalysisCount()).resolves.toBe(1)
    await expect(adminRepository.getOverlayCount()).resolves.toBe(2)
    await expect(adminRepository.getUnrefreshedOverlayCount()).resolves.toBe(1)
  })

  it('builds recent report rows and anomalies from SQL data', async () => {
    const { analysisId } = await insertKeywordAnalysisOverlay()
    await pool.query(
      `
      INSERT INTO keyword_stock_overlays (
        analysis_id,
        ticker,
        company_name,
        display_order
      )
      VALUES ($1, 'MSFT', 'Microsoft', 2)
      `,
      [analysisId]
    )

    const [recentAnalyses, recentOverlays, anomalies] = await Promise.all([
      adminRepository.findRecentAnalyses(),
      adminRepository.findRecentOverlays(),
      adminRepository.findAnomalies(),
    ])

    expect(recentAnalyses[0]).toMatchObject({
      keyword: 'AI chips',
      region: 'GLOBAL',
      searchType: 'WEB',
      period: '5Y',
      pointCount: 1,
    })
    expect(recentOverlays).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: 'AI chips',
          conditionLabel: 'GLOBAL / WEB',
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
          pointCount: 1,
        }),
      ])
    )
    expect(anomalies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'analysis',
          label: 'AI chips',
          reason: '트렌드 포인트 부족',
        }),
        expect.objectContaining({
          type: 'overlay',
          label: 'MSFT · AI chips',
          reason: '주가 데이터 없음',
        }),
      ])
    )
  })
})

async function insertKeywordAnalysisOverlay() {
  const keyword = await pool.query<{ id: string }>(
    `
    INSERT INTO keywords (user_id, name, normalized_name, display_order)
    VALUES ($1, 'AI chips', 'AI chips', 1)
    RETURNING id
    `,
    [userId]
  )
  const analysis = await pool.query<{ id: string }>(
    `
    INSERT INTO keyword_analysis (
      keyword_id,
      region,
      period,
      search_type,
      trends_data,
      display_order
    )
    VALUES (
      $1,
      'GLOBAL',
      '5Y',
      'WEB',
      '[{"date":"2026-01-01","value":50}]'::jsonb,
      1
    )
    RETURNING id
    `,
    [keyword.rows[0].id]
  )
  const overlay = await pool.query<{ id: string }>(
    `
    INSERT INTO keyword_stock_overlays (
      analysis_id,
      ticker,
      company_name,
      display_order,
      last_refreshed_at
    )
    VALUES ($1, 'AAPL', 'Apple Inc.', 1, now())
    RETURNING id
    `,
    [analysis.rows[0].id]
  )

  await pool.query(
    `
    INSERT INTO overlay_chart_timeseries (
      overlay_id,
      date,
      raw_price,
      normalized_price
    )
    VALUES ($1, '2026-01-01', 100, 50)
    `,
    [overlay.rows[0].id]
  )

  return {
    keywordId: keyword.rows[0].id,
    analysisId: analysis.rows[0].id,
    overlayId: overlay.rows[0].id,
  }
}
