/**
 * Supabase Client Initialization
 *
 * Creates and exports a Supabase client for database operations.
 * SUPABASE_URL과 publishable key는 필수 환경 변수입니다.
 *
 * Usage:
 *   import { getSupabaseClient } from '@/lib/supabase'
 *   const supabase = getSupabaseClient()
 *   const { data, error } = await supabase.from('searches').select('*')
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabasePublishableKey, getSupabaseUrl } from './supabase/keys'

let supabaseClient: SupabaseClient | null = null

/**
 * Get or create Supabase client
 *
 * Supabase 클라이언트를 반환합니다 (싱글톤 패턴).
 * 새 Supabase publishable key를 우선 사용하고 legacy anon key는 fallback으로만 사용합니다.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient
  }

  supabaseClient = createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: {
      persistSession: false,
    },
  })

  return supabaseClient
}
