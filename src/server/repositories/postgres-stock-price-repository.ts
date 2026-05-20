import type pg from 'pg'
import type { PriceDataPoint } from '@/types/database'
import type { StockPriceRepository } from './stock-price-repository'

type PriceRow = {
  date: string
  close: string | number
  open: string | number | null
  high: string | number | null
  low: string | number | null
  volume: string | number | null
}

export class PostgresStockPriceRepository implements StockPriceRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findBySearchId(searchId: string): Promise<PriceDataPoint[]> {
    const result = await this.pool.query<PriceRow>(
      `
      SELECT date, close, open, high, low, volume
      FROM stock_price_data
      WHERE search_id = $1
      ORDER BY date ASC
      `,
      [searchId]
    )

    return result.rows.map(row => ({
      date: row.date,
      close: Number(row.close),
      open: toOptionalNumber(row.open),
      high: toOptionalNumber(row.high),
      low: toOptionalNumber(row.low),
      volume: toOptionalNumber(row.volume),
    }))
  }

  async upsertMany(
    searchId: string,
    priceData: PriceDataPoint[]
  ): Promise<void> {
    if (priceData.length === 0) return

    await this.pool.query('BEGIN')
    try {
      for (const point of priceData) {
        await this.pool.query(
          `
          INSERT INTO stock_price_data (
            search_id,
            date,
            close,
            open,
            high,
            low,
            volume
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (search_id, date)
          DO UPDATE SET
            close = EXCLUDED.close,
            open = EXCLUDED.open,
            high = EXCLUDED.high,
            low = EXCLUDED.low,
            volume = EXCLUDED.volume
          `,
          [
            searchId,
            point.date,
            point.close,
            point.open ?? null,
            point.high ?? null,
            point.low ?? null,
            point.volume ?? null,
          ]
        )
      }
      await this.pool.query('COMMIT')
    } catch (error) {
      await this.pool.query('ROLLBACK')
      throw error
    }
  }

  async deleteBefore(searchId: string, date: string): Promise<void> {
    await this.pool.query(
      `
      DELETE FROM stock_price_data
      WHERE search_id = $1 AND date < $2
      `,
      [searchId, date]
    )
  }
}

function toOptionalNumber(value: string | number | null): number | undefined {
  if (value === null) return undefined
  return typeof value === 'number' ? value : Number(value)
}
