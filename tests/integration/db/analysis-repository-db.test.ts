import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type pg from 'pg'
import { PostgresAnalysisRepository } from '@/server/repositories/postgres-analysis-repository'
import type { AnalysisRepository } from '@/server/repositories/analysis-repository'
import {
  startPostgresTestDatabase,
  type PostgresTestDatabase,
} from './setup-postgres'

const userId = '00000000-0000-0000-0000-000000000201'
const otherUserId = '00000000-0000-0000-0000-000000000202'

let database: PostgresTestDatabase
let pool: pg.Pool
let repository: AnalysisRepository

describe('PostgresAnalysisRepository integration', () => {
  beforeAll(async () => {
    database = await startPostgresTestDatabase()
    pool = database.pool
    repository = new PostgresAnalysisRepository(pool)
  })

  afterAll(async () => {
    await database?.stop()
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE keywords CASCADE')
  })

  it('creates an analysis with the next user-scoped display order', async () => {
    const keywordId = await insertKeyword(userId, 'AI chips')
    const otherKeywordId = await insertKeyword(otherUserId, 'Private')
    await repository.create({
      keyword_id: otherKeywordId,
      region: 'GLOBAL',
      period: '5Y',
      search_type: 'WEB',
      trends_data: [],
    })

    const createdId = await repository.create({
      keyword_id: keywordId,
      region: 'GLOBAL',
      period: '5Y',
      search_type: 'WEB',
      trends_data: [
        { date: '2026-01-01', value: 50, ma13Value: 45, yoyValue: 8 },
      ],
      ma13_data: 45,
      yoy_data: 8,
    })

    const analysis = await repository.findByFilters(
      userId,
      keywordId,
      'GLOBAL',
      '5Y',
      'WEB'
    )

    expect(analysis).toMatchObject({
      id: createdId,
      keyword_id: keywordId,
      region: 'GLOBAL',
      period: '5Y',
      search_type: 'WEB',
      ma13_data: 45,
      yoy_data: 8,
      display_order: 1,
    })
  })

  it('updates an existing filter combination instead of creating a duplicate row', async () => {
    const keywordId = await insertKeyword(userId, 'Robotics')
    const firstId = await repository.create({
      keyword_id: keywordId,
      region: 'US',
      period: '5Y',
      search_type: 'WEB',
      trends_data: [
        { date: '2026-01-01', value: 10, ma13Value: null, yoyValue: null },
      ],
    })
    const secondId = await repository.create({
      keyword_id: keywordId,
      region: 'US',
      period: '5Y',
      search_type: 'WEB',
      trends_data: [
        { date: '2026-01-08', value: 20, ma13Value: 18, yoyValue: 4 },
      ],
      ma13_data: 18,
      yoy_data: 4,
    })

    expect(secondId).toBe(firstId)

    const rows = await pool.query(
      `
      SELECT trends_data, ma13_data, yoy_data
      FROM keyword_analysis
      WHERE keyword_id = $1 AND region = 'US' AND period = '5Y' AND search_type = 'WEB'
      `,
      [keywordId]
    )

    expect(rows.rowCount).toBe(1)
    expect(rows.rows[0].trends_data).toEqual([
      { date: '2026-01-08', value: 20, ma13Value: 18, yoyValue: 4 },
    ])
    expect(Number(rows.rows[0].ma13_data)).toBe(18)
    expect(Number(rows.rows[0].yoy_data)).toBe(4)
  })

  it('returns only analyses owned by the current user', async () => {
    const keywordId = await insertKeyword(userId, 'Battery')
    const foreignKeywordId = await insertKeyword(otherUserId, 'Battery')
    await repository.create({
      keyword_id: keywordId,
      region: 'GLOBAL',
      period: '5Y',
      search_type: 'WEB',
      trends_data: [],
    })
    const foreignAnalysisId = await repository.create({
      keyword_id: foreignKeywordId,
      region: 'GLOBAL',
      period: '5Y',
      search_type: 'WEB',
      trends_data: [],
    })

    await expect(
      repository.findOwnedById(userId, foreignAnalysisId)
    ).resolves.toBeNull()
    await expect(
      repository.findByFilters(userId, foreignKeywordId, 'GLOBAL', '5Y', 'WEB')
    ).resolves.toBeNull()
  })

  it('finds an owned analysis with its keyword name for refresh workflows', async () => {
    const keywordId = await insertKeyword(userId, 'Cloud')
    const analysisId = await repository.create({
      keyword_id: keywordId,
      region: 'KR',
      period: '5Y',
      search_type: 'NEWS',
      trends_data: [],
    })

    const result = await repository.findOwnedWithKeyword(userId, analysisId)

    expect(result).toMatchObject({
      keyword: 'Cloud',
      analysis: {
        id: analysisId,
        keyword_id: keywordId,
        region: 'KR',
        search_type: 'NEWS',
      },
    })
  })

  it('returns the owned keyword name and hides foreign keywords', async () => {
    const keywordId = await insertKeyword(userId, 'Cloud')
    const foreignKeywordId = await insertKeyword(otherUserId, 'Private Cloud')

    await expect(
      repository.getOwnedKeywordName(userId, keywordId)
    ).resolves.toBe('Cloud')
    await expect(
      repository.getOwnedKeywordName(userId, foreignKeywordId)
    ).resolves.toBeNull()
  })

  it('keeps an existing analysis unchanged when duplicate creation has no trends data', async () => {
    const keywordId = await insertKeyword(userId, 'Stable analysis')
    const analysisId = await repository.create({
      keyword_id: keywordId,
      region: 'GLOBAL',
      period: '5Y',
      search_type: 'WEB',
      trends_data: [
        { date: '2026-01-01', value: 10, ma13Value: null, yoyValue: null },
      ],
    })

    await expect(
      repository.create({
        keyword_id: keywordId,
        region: 'GLOBAL',
        period: '5Y',
        search_type: 'WEB',
        trends_data: [],
      })
    ).resolves.toBe(analysisId)

    const analysis = await repository.findOwnedById(userId, analysisId)
    expect(analysis?.trends_data).toEqual([
      { date: '2026-01-01', value: 10, ma13Value: null, yoyValue: null },
    ])
  })

  it('updates, reorders, and deletes owned analyses using direct SQL behavior', async () => {
    const keywordId = await insertKeyword(userId, 'Semiconductor')
    const firstId = await repository.create({
      keyword_id: keywordId,
      region: 'GLOBAL',
      period: '5Y',
      search_type: 'WEB',
      trends_data: [],
    })
    const secondId = await repository.create({
      keyword_id: keywordId,
      region: 'US',
      period: '5Y',
      search_type: 'WEB',
      trends_data: [],
    })

    await expect(
      repository.update(firstId, {
        trends_data: [
          { date: '2026-01-01', value: 70, ma13Value: 60, yoyValue: 12 },
        ],
        ma13_data: 60,
        yoy_data: 12,
      })
    ).resolves.toBe(true)

    await repository.reorder(userId, [secondId, firstId])

    const ordered = await repository.findManyByKeywordId(userId, keywordId)
    expect(ordered.map(analysis => analysis.id)).toEqual([secondId, firstId])
    expect(ordered[1]).toMatchObject({
      id: firstId,
      ma13_data: 60,
      yoy_data: 12,
    })

    await expect(repository.deleteById(firstId)).resolves.toBe(true)
    await expect(repository.findOwnedById(userId, firstId)).resolves.toBeNull()
  })

  it('returns false when updating or deleting a missing analysis', async () => {
    const missingId = '00000000-0000-0000-0000-000000000299'

    await expect(
      repository.update(missingId, {
        ma13_data: 10,
      })
    ).resolves.toBe(false)
    await expect(repository.deleteById(missingId)).resolves.toBe(false)
  })

  it.each([
    {
      caseName: 'empty order',
      orderedIds: [],
      error: 'INVALID_ORDER',
    },
    {
      caseName: 'duplicated id',
      orderedIds: [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
      ],
      error: 'DUPLICATE_ANALYSIS_ID',
    },
  ])(
    'rejects invalid reorder input: $caseName',
    async ({ orderedIds, error }) => {
      await expect(repository.reorder(userId, orderedIds)).rejects.toThrow(
        error
      )
    }
  )

  it('rejects reorder requests containing another user analysis', async () => {
    const keywordId = await insertKeyword(userId, 'Owner')
    const foreignKeywordId = await insertKeyword(otherUserId, 'Foreign')
    const ownedId = await repository.create({
      keyword_id: keywordId,
      region: 'GLOBAL',
      period: '5Y',
      search_type: 'WEB',
      trends_data: [],
    })
    const foreignId = await repository.create({
      keyword_id: foreignKeywordId,
      region: 'GLOBAL',
      period: '5Y',
      search_type: 'WEB',
      trends_data: [],
    })

    await expect(
      repository.reorder(userId, [ownedId, foreignId])
    ).rejects.toThrow('ANALYSIS_OWNERSHIP_MISMATCH')
  })
})

async function insertKeyword(userId: string, name: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `
    INSERT INTO keywords (user_id, name, normalized_name, display_order)
    VALUES ($1, $2, $2, 1)
    RETURNING id
    `,
    [userId, name]
  )

  return result.rows[0].id
}
