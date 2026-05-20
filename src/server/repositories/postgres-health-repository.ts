import type pg from 'pg'
import type { HealthRepository } from './health-repository'

export class PostgresHealthRepository implements HealthRepository {
  constructor(private readonly pool: pg.Pool) {}

  async checkDatabase(): Promise<void> {
    await this.pool.query('SELECT 1')
  }
}
