/**
 * Supabase Client Initialization
 *
 * Creates and exports a Supabase client for database operations.
 * SUPABASE_URL과 SUPABASE_KEY는 필수 환경 변수입니다 (env.ts에서 검증됨).
 *
 * Usage:
 *   import { getSupabaseClient } from '@/lib/supabase'
 *   const supabase = getSupabaseClient()
 *   const { data, error } = await supabase.from('searches').select('*')
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

let supabaseClient: SupabaseClient | null = null

/**
 * Get or create Supabase client
 *
 * Supabase 클라이언트를 반환합니다 (싱글톤 패턴).
 * SUPABASE_URL과 SUPABASE_KEY는 env.ts에서 이미 검증되므로,
 * 이 함수가 호출되는 시점에는 항상 유효한 설정이 보장됩니다.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient
  }

  // NOTE: env.ts의 Zod 검증으로 인해 다음 조건은 실행되지 않습니다.
  // 방어 코드로 유지하여 향후 env.ts 변경 시 안전성 확보.
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
    throw new Error(
      'Supabase configuration missing. Set SUPABASE_URL and SUPABASE_KEY in environment.'
    )
  }

  supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
    auth: {
      persistSession: false,
    },
  })

  return supabaseClient
}
