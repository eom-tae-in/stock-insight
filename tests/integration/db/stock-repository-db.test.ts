import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type pg from 'pg'
import { PostgresStockPriceRepository } from '@/server/repositories/postgres-stock-price-repository'
import { PostgresStockSearchRepository } from '@/server/repositories/postgres-stock-search-repository'
import type { StockPriceRepository } from '@/server/repositories/stock-price-repository'
import type { StockSearchRepository } from '@/server/repositories/stock-search-repository'
import type { SearchRecord } from '@/types/database'
import {
  startPostgresTestDatabase,
  type PostgresTestDatabase,
} from './setup-postgres'

const userId = '00000000-0000-0000-0000-000000000401'
const otherUserId = '00000000-0000-0000-0000-000000000402'

let database: PostgresTestDatabase
let pool: pg.Pool
let priceRepository: StockPriceRepository
let searchRepository: StockSearchRepository

describe('Postgres stock repositories integration', () => {
  beforeAll(async () => {
    database = await startPostgresTestDatabase()
    pool = database.pool
    priceRepository = new PostgresStockPriceRepository(pool)
    searchRepository = new PostgresStockSearchRepository(pool, priceRepository)
  })

  afterAll(async () => {
    await database?.stop()
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE searches CASCADE')
  })

  it('upserts saved stock searches and returns the existing row for the same user ticker', async () => {
    const createdId = await searchRepository.upsert(
      createSearchRecord({ ticker: 'aapl', company_name: 'Apple Inc.' })
    )
    const updatedId = await searchRepository.upsert(
      createSearchRecord({
        ticker: 'AAPL',
        company_name: 'Apple',
        current_price: 200,
      })
    )

    const found = await searchRepository.findByTicker(userId, 'aapl')

    expect(updatedId).toBe(createdId)
    expect(found).toMatchObject({
      id: createdId,
      user_id: userId,
      ticker: 'AAPL',
      company_name: 'Apple',
      current_price: 200,
    })
    await expect(
      searchRepository.findByTicker(otherUserId, 'AAPL')
    ).resolves.toBeNull()
  })

  it('loads only the current user searches with their price data', async () => {
    const firstId = await searchRepository.upsert(
      createSearchRecord({
        ticker: 'MSFT',
        searched_at: '2026-01-01T00:00:00.000Z',
      })
    )
    const secondId = await searchRepository.upsert(
      createSearchRecord({
        ticker: 'NVDA',
        searched_at: '2026-01-08T00:00:00.000Z',
      })
    )
    await searchRepository.upsert(
      createSearchRecord({
        user_id: otherUserId,
        ticker: 'TSLA',
      })
    )
    await priceRepository.upsertMany(firstId, [
      { date: '2026-01-01', close: 100 },
    ])
    await priceRepository.upsertMany(secondId, [
      { date: '2026-01-01', close: 200 },
    ])

    const searches = await searchRepository.findManyByUserId(userId)

    expect(searches.map(search => search.ticker)).toEqual(['NVDA', 'MSFT'])
    expect(searches.every(search => search.user_id === userId)).toBe(true)
    expect(searches[0].price_data).toEqual([{ date: '2026-01-01', close: 200 }])
  })

  it('finds saved stock suggestions by ticker prefix or company name', async () => {
    await searchRepository.upsert(
      createSearchRecord({ ticker: 'AAPL', company_name: 'Apple Inc.' })
    )
    await searchRepository.upsert(
      createSearchRecord({ ticker: 'MSFT', company_name: 'Microsoft' })
    )

    await expect(searchRepository.findSuggestions('app', 10)).resolves.toEqual([
      { ticker: 'AAPL', companyName: 'Apple Inc.' },
    ])
    await expect(searchRepository.findSuggestions('MS', 10)).resolves.toEqual([
      { ticker: 'MSFT', companyName: 'Microsoft' },
    ])
  })

  it('upserts price rows by search id and date', async () => {
    const searchId = await searchRepository.upsert(createSearchRecord())

    await expect(
      priceRepository.upsertMany(searchId, [])
    ).resolves.toBeUndefined()

    await priceRepository.upsertMany(searchId, [
      {
        date: '2026-01-01',
        close: 100,
        open: 95,
        high: 110,
        low: 90,
        volume: 10,
      },
      { date: '2026-01-08', close: 120 },
    ])
    await priceRepository.upsertMany(searchId, [
      {
        date: '2026-01-01',
        close: 105,
        open: 100,
        high: 115,
        low: 99,
        volume: 20,
      },
    ])

    const priceData = await priceRepository.findBySearchId(searchId)

    expect(priceData).toEqual([
      {
        date: '2026-01-01',
        close: 105,
        open: 100,
        high: 115,
        low: 99,
        volume: 20,
      },
      {
        date: '2026-01-08',
        close: 120,
        open: undefined,
        high: undefined,
        low: undefined,
        volume: undefined,
      },
    ])
  })

  it('updates search metrics and prunes old price rows during refresh-like workflows', async () => {
    const searchId = await searchRepository.upsert(createSearchRecord())
    await priceRepository.upsertMany(searchId, [
      { date: '2025-12-25', close: 90 },
      { date: '2026-01-01', close: 100 },
    ])

    await expect(
      searchRepository.update(userId, searchId, {
        company_name: 'Apple Updated',
        current_price: 130,
        previous_close: 100,
        last_updated_at: '2026-01-08T00:00:00.000Z',
      })
    ).resolves.toBe(true)
    await priceRepository.deleteBefore(searchId, '2026-01-01')
    await priceRepository.upsertMany(searchId, [
      { date: '2026-01-01', close: 110 },
      { date: '2026-01-08', close: 130 },
    ])

    const refreshed = await searchRepository.findById(userId, searchId)

    expect(refreshed).toMatchObject({
      company_name: 'Apple Updated',
      current_price: 130,
      previous_close: 100,
      last_updated_at: '2026-01-08T00:00:00.000Z',
    })
    expect(refreshed?.price_data).toEqual([
      { date: '2026-01-01', close: 110 },
      { date: '2026-01-08', close: 130 },
    ])
    await expect(
      searchRepository.update(otherUserId, searchId, {
        company_name: 'Foreign update',
      })
    ).resolves.toBe(false)
  })

  it('falls back to the latest price row when current price is missing', async () => {
    const searchId = await searchRepository.upsert(
      createSearchRecord({
        current_price: undefined,
      })
    )
    await priceRepository.upsertMany(searchId, [
      { date: '2026-01-01', close: 100 },
      { date: '2026-01-08', close: 130 },
    ])

    const found = await searchRepository.findById(userId, searchId)

    expect(found?.current_price).toBe(130)
  })

  it('deletes only the current user search and cascades price rows', async () => {
    const searchId = await searchRepository.upsert(createSearchRecord())
    await priceRepository.upsertMany(searchId, [
      { date: '2026-01-01', close: 100 },
    ])

    await expect(
      searchRepository.deleteById(otherUserId, searchId)
    ).resolves.toBe(false)
    await expect(searchRepository.deleteById(userId, searchId)).resolves.toBe(
      true
    )
    await expect(
      searchRepository.findById(userId, searchId)
    ).resolves.toBeNull()
    await expect(priceRepository.findBySearchId(searchId)).resolves.toEqual([])
  })
})

function createSearchRecord(
  overrides: Partial<SearchRecord> = {}
): SearchRecord {
  return {
    id: '00000000-0000-0000-0000-000000000499',
    user_id: userId,
    ticker: 'AAPL',
    company_name: 'Apple Inc.',
    currency: 'USD',
    weekly_open: 95,
    weekly_high: 110,
    weekly_low: 90,
    current_price: 100,
    previous_close: 98,
    ma13: 99,
    yoy_change: 10,
    price_data: [],
    searched_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    last_updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}
