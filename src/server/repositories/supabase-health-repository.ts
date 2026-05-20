import type { SupabaseClient } from '@supabase/supabase-js'
import type { HealthRepository } from './health-repository'

export class SupabaseHealthRepository implements HealthRepository {
  constructor(private readonly client: SupabaseClient) {}

  async checkDatabase(): Promise<void> {
    const { error } = await this.client.from('searches').select('id').limit(1)
    if (error) throw error
  }
}
