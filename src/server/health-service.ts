import type { SupabaseClient } from '@supabase/supabase-js'
import type { HealthRepository } from './repositories/health-repository'
import { SupabaseHealthRepository } from './repositories/supabase-health-repository'

export function createHealthService(repository: HealthRepository) {
  return {
    checkDatabase() {
      return repository.checkDatabase()
    },
  }
}

function createSupabaseHealthService(supabase: SupabaseClient) {
  return createHealthService(new SupabaseHealthRepository(supabase))
}

export function checkDatabaseHealth(supabase: SupabaseClient) {
  return createSupabaseHealthService(supabase).checkDatabase()
}
