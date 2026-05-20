import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type pg from 'pg'
import { PostgresKeywordRepository } from '@/server/repositories/postgres-keyword-repository'
import type { KeywordRepository } from '@/server/repositories/keyword-repository'
import {
  startPostgresTestDatabase,
  type PostgresTestDatabase,
} from './setup-postgres'

const userId = '00000000-0000-0000-0000-000000000101'
const otherUserId = '00000000-0000-0000-0000-000000000102'

let database: PostgresTestDatabase
let pool: pg.Pool
let repository: KeywordRepository

describe('PostgresKeywordRepository integration', () => {
  beforeAll(async () => {
    database = await startPostgresTestDatabase()
    pool = database.pool
    repository = new PostgresKeywordRepository(pool)
  })

  afterAll(async () => {
    await database?.stop()
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE keywords CASCADE')
  })

  it('rejects blank keyword names before writing to the database', async () => {
    await expect(repository.upsert(userId, '   ')).rejects.toThrow(
      'KEYWORD_REQUIRED'
    )
    await expect(
      repository.updateName(userId, '00000000-0000-0000-0000-000000000999', '')
    ).rejects.toThrow('KEYWORD_REQUIRED')
  })

  it('upserts normalized keywords and returns an existing row on duplicate input', async () => {
    const created = await repository.upsert(userId, '  AI   chips ')
    const duplicated = await repository.upsert(userId, 'AI chips')

    expect(created).toMatchObject({
      id: duplicated.id,
      keyword: 'AI chips',
      normalized_keyword: 'AI chips',
      display_order: 1,
    })

    const rows = await pool.query(
      'SELECT id FROM keywords WHERE user_id = $1 AND normalized_name = $2',
      [userId, 'AI chips']
    )
    expect(rows.rowCount).toBe(1)
  })

  it('finds only the current user keywords in display order', async () => {
    await repository.upsert(userId, 'AI chips')
    await repository.upsert(userId, 'Battery')
    await repository.upsert(otherUserId, 'Semiconductor')

    const keywords = await repository.findManyByUserId(userId)

    expect(keywords.map(keyword => keyword.keyword)).toEqual([
      'AI chips',
      'Battery',
    ])
    expect(keywords.every(keyword => keyword.user_id === userId)).toBe(true)
  })

  it('hydrates keyword analyses and deduplicated overlays in display order', async () => {
    const keyword = await repository.upsert(userId, 'AI chips')
    const firstAnalysisId = await insertAnalysis(keyword.id, 'GLOBAL', 1)
    const secondAnalysisId = await insertAnalysis(keyword.id, 'US', 2)
    const oldAnalysisId = await insertAnalysis(keyword.id, 'KR', 3, '1Y')
    await insertOverlay(firstAnalysisId, 'aapl', 'Apple Inc.', 2)
    await insertOverlay(firstAnalysisId, 'AAPL', 'Apple Duplicate', 1)
    await insertOverlay(secondAnalysisId, 'MSFT', 'Microsoft', 1)

    const hydrated = await repository.findById(userId, keyword.id)

    expect(hydrated).toMatchObject({
      id: keyword.id,
      keyword: 'AI chips',
      overlays: [
        {
          ticker: 'AAPL',
          company_name: 'Apple Duplicate',
          display_order: 1,
        },
        {
          ticker: 'MSFT',
          company_name: 'Microsoft',
          display_order: 1,
        },
      ],
      analyses: [
        {
          id: firstAnalysisId,
          region: 'GLOBAL',
          period: '5Y',
          overlays: expect.arrayContaining([
            expect.objectContaining({ ticker: 'aapl' }),
            expect.objectContaining({ ticker: 'AAPL' }),
          ]),
        },
        {
          id: secondAnalysisId,
          region: 'US',
          period: '5Y',
        },
      ],
    })
    expect(
      hydrated?.analyses?.some(analysis => analysis.id === oldAnalysisId)
    ).toBe(false)
    expect(hydrated?.searched_at).toBe(hydrated?.updated_at)
  })

  it('updates a keyword name and returns null for another user keyword', async () => {
    const target = await repository.upsert(userId, 'Robotics')

    await expect(
      repository.updateName(otherUserId, target.id, 'Robotics US')
    ).resolves.toBeNull()

    const updated = await repository.updateName(
      userId,
      target.id,
      'Robotics US'
    )

    expect(updated).toMatchObject({
      id: target.id,
      keyword: 'Robotics US',
      normalized_keyword: 'Robotics US',
    })
  })

  it('reorders owned keywords and rejects foreign keyword ids', async () => {
    const first = await repository.upsert(userId, 'Cloud')
    const second = await repository.upsert(userId, 'Edge AI')
    const foreign = await repository.upsert(otherUserId, 'Private keyword')

    await expect(
      repository.reorder(userId, [first.id, foreign.id])
    ).rejects.toThrow('KEYWORD_OWNERSHIP_MISMATCH')

    await repository.reorder(userId, [second.id, first.id])

    const result = await pool.query<{ id: string; display_order: number }>(
      `
      SELECT id, display_order
      FROM keywords
      WHERE id = ANY($1::uuid[])
      ORDER BY display_order ASC
      `,
      [[first.id, second.id]]
    )

    expect(result.rows).toEqual([
      { id: second.id, display_order: 1 },
      { id: first.id, display_order: 2 },
    ])
  })

  it('rejects invalid and duplicated keyword reorder input', async () => {
    const keyword = await repository.upsert(userId, 'Cloud')

    await expect(repository.reorder(userId, [])).rejects.toThrow(
      'INVALID_ORDER'
    )
    await expect(
      repository.reorder(userId, [keyword.id, keyword.id])
    ).rejects.toThrow('DUPLICATE_KEYWORD_ID')
  })

  it('deletes only the current user keyword', async () => {
    const target = await repository.upsert(userId, 'Delete me')

    await expect(repository.deleteById(otherUserId, target.id)).resolves.toBe(
      false
    )
    await expect(repository.deleteById(userId, target.id)).resolves.toBe(true)
    await expect(repository.findById(userId, target.id)).resolves.toBeNull()
  })
})

async function insertAnalysis(
  keywordId: string,
  region: string,
  displayOrder: number,
  period = '5Y'
): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `
    INSERT INTO keyword_analysis (
      keyword_id,
      region,
      period,
      search_type,
      trends_data,
      display_order,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      'WEB',
      '[{"date":"2026-01-01","value":50}]'::jsonb,
      $4,
      now() + ($4::integer * interval '1 minute')
    )
    RETURNING id
    `,
    [keywordId, region, period, displayOrder]
  )

  return result.rows[0].id
}

async function insertOverlay(
  analysisId: string,
  ticker: string,
  companyName: string,
  displayOrder: number
): Promise<string> {
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
    [analysisId, ticker, companyName, displayOrder]
  )

  return result.rows[0].id
}
