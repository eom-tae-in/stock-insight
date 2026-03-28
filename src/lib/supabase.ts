/**
 * Supabase Client Initialization
 *
 * Creates and exports a Supabase client for database operations.
 * Only initialized if USE_SUPABASE environment variable is true.
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
 * Only call this if USE_SUPABASE is true
 *
 * @throws {Error} If SUPABASE_URL or SUPABASE_KEY is not configured
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient
  }

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
