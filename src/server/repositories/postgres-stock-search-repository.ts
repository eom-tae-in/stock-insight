import type pg from 'pg'
import type { SearchRecord } from '@/types/database'
import type { StockPriceRepository } from './stock-price-repository'
import type {
  StockSearchRepository,
  StockSearchUpdateData,
  StockSuggestion,
} from './stock-search-repository'
import { PostgresStockPriceRepository } from './postgres-stock-price-repository'

type SearchRow = {
  id: string
  user_id: string
  ticker: string
  company_name: string
  currency: string | null
  weekly_open: string | number | null
  weekly_high: string | number | null
  weekly_low: string | number | null
  current_price: string | number | null
  previous_close: string | number | null
  ma13: string | number | null
  yoy_change: string | number | null
  last_updated_at: Date | string | null
  searched_at: Date | string
  created_at: Date | string
}

export class PostgresStockSearchRepository implements StockSearchRepository {
  private readonly priceRepository: StockPriceRepository

  constructor(
    private readonly pool: pg.Pool,
    priceRepository?: StockPriceRepository
  ) {
    this.priceRepository =
      priceRepository ?? new PostgresStockPriceRepository(pool)
  }

  async upsert(record: SearchRecord): Promise<string> {
    const result = await this.pool.query<{ id: string }>(
      `
      INSERT INTO searches (
        user_id,
        ticker,
        company_name,
        currency,
        weekly_open,
        weekly_high,
        weekly_low,
        searched_at,
        current_price,
        previous_close,
        ma13,
        yoy_change,
        last_updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id, ticker)
      DO UPDATE SET
        company_name = EXCLUDED.company_name,
        currency = EXCLUDED.currency,
        weekly_open = EXCLUDED.weekly_open,
        weekly_high = EXCLUDED.weekly_high,
        weekly_low = EXCLUDED.weekly_low,
        searched_at = EXCLUDED.searched_at,
        current_price = EXCLUDED.current_price,
        previous_close = EXCLUDED.previous_close,
        ma13 = EXCLUDED.ma13,
        yoy_change = EXCLUDED.yoy_change,
        last_updated_at = EXCLUDED.last_updated_at
      RETURNING id
      `,
      [
        record.user_id,
        record.ticker.toUpperCase(),
        record.company_name,
        record.currency || 'USD',
        record.weekly_open ?? null,
        record.weekly_high ?? null,
        record.weekly_low ?? null,
        record.searched_at,
        record.current_price ?? null,
        record.previous_close ?? null,
        record.ma13 ?? null,
        record.yoy_change ?? null,
        record.last_updated_at ?? null,
      ]
    )

    return result.rows[0].id
  }

  async findById(
    userId: string,
    searchId: string
  ): Promise<SearchRecord | null> {
    const result = await this.pool.query<SearchRow>(
      `
      SELECT *
      FROM searches
      WHERE id = $1 AND user_id = $2
      `,
      [searchId, userId]
    )

    return result.rows[0] ? this.toSearchRecord(result.rows[0]) : null
  }

  async findByTicker(
    userId: string,
    ticker: string
  ): Promise<SearchRecord | null> {
    const result = await this.pool.query<SearchRow>(
      `
      SELECT *
      FROM searches
      WHERE ticker = $1 AND user_id = $2
      `,
      [ticker.toUpperCase(), userId]
    )

    return result.rows[0] ? this.toSearchRecord(result.rows[0]) : null
  }

  async findManyByUserId(userId: string): Promise<SearchRecord[]> {
    const result = await this.pool.query<SearchRow>(
      `
      SELECT *
      FROM searches
      WHERE user_id = $1
      ORDER BY searched_at DESC
      `,
      [userId]
    )

    return Promise.all(result.rows.map(row => this.toSearchRecord(row)))
  }

  async findSuggestions(
    query: string,
    limit: number
  ): Promise<StockSuggestion[]> {
    const result = await this.pool.query<{
      ticker: string
      company_name: string
    }>(
      `
      SELECT ticker, company_name
      FROM searches
      WHERE ticker ILIKE $1 OR company_name ILIKE $2
      ORDER BY ticker ASC
      LIMIT $3
      `,
      [`${query}%`, `%${query}%`, limit]
    )

    return result.rows.map(row => ({
      ticker: row.ticker,
      companyName: row.company_name,
    }))
  }

  async update(
    userId: string,
    searchId: string,
    data: StockSearchUpdateData
  ): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(
      `
      UPDATE searches
      SET company_name = COALESCE($3, company_name),
          currency = COALESCE($4, currency),
          weekly_open = CASE WHEN $5::boolean THEN $6::numeric ELSE weekly_open END,
          weekly_high = CASE WHEN $7::boolean THEN $8::numeric ELSE weekly_high END,
          weekly_low = CASE WHEN $9::boolean THEN $10::numeric ELSE weekly_low END,
          current_price = CASE WHEN $11::boolean THEN $12::numeric ELSE current_price END,
          previous_close = CASE WHEN $13::boolean THEN $14::numeric ELSE previous_close END,
          ma13 = CASE WHEN $15::boolean THEN $16::numeric ELSE ma13 END,
          yoy_change = CASE WHEN $17::boolean THEN $18::numeric ELSE yoy_change END,
          last_updated_at = COALESCE($19, last_updated_at)
      WHERE id = $1 AND user_id = $2
      RETURNING id
      `,
      [
        searchId,
        userId,
        data.company_name ?? null,
        data.currency ?? null,
        data.weekly_open !== undefined,
        data.weekly_open ?? null,
        data.weekly_high !== undefined,
        data.weekly_high ?? null,
        data.weekly_low !== undefined,
        data.weekly_low ?? null,
        data.current_price !== undefined,
        data.current_price ?? null,
        data.previous_close !== undefined,
        data.previous_close ?? null,
        data.ma13 !== undefined,
        data.ma13 ?? null,
        data.yoy_change !== undefined,
        data.yoy_change ?? null,
        data.last_updated_at ?? null,
      ]
    )

    return (result.rowCount ?? 0) > 0
  }

  async deleteById(userId: string, searchId: string): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(
      `
      DELETE FROM searches
      WHERE id = $1 AND user_id = $2
      RETURNING id
      `,
      [searchId, userId]
    )

    return (result.rowCount ?? 0) > 0
  }

  private async toSearchRecord(row: SearchRow): Promise<SearchRecord> {
    const priceData = await this.priceRepository.findBySearchId(row.id)

    return {
      id: row.id,
      user_id: row.user_id,
      ticker: row.ticker,
      company_name: row.company_name,
      currency: row.currency ?? undefined,
      weekly_open: toOptionalNumber(row.weekly_open),
      weekly_high: toOptionalNumber(row.weekly_high),
      weekly_low: toOptionalNumber(row.weekly_low),
      current_price:
        toOptionalNumber(row.current_price) ??
        (priceData.length > 0 ? priceData[priceData.length - 1].close : 0),
      previous_close: toOptionalNumber(row.previous_close),
      ma13: toOptionalNumber(row.ma13),
      yoy_change: toOptionalNumber(row.yoy_change),
      price_data: priceData,
      trends_data: [],
      last_updated_at: row.last_updated_at
        ? toIsoString(row.last_updated_at)
        : undefined,
      searched_at: toIsoString(row.searched_at),
      created_at: toIsoString(row.created_at),
    }
  }
}

function toOptionalNumber(value: string | number | null): number | undefined {
  if (value === null) return undefined
  return typeof value === 'number' ? value : Number(value)
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}
