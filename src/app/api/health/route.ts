import { env } from '@/lib/env'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET() {
  try {
    const primaryMode = env.DB_WRITE_MODE === 'supabase' ? 'supabase' : 'sqlite'
    const isSupabasePrimary =
      env.DB_READ_MODE === 'supabase' && env.DB_WRITE_MODE === 'supabase'

    let supabaseStatus: 'connected' | 'disconnected' | 'fallback' =
      'disconnected'
    let sqliteStatus: 'connected' | 'disconnected' | 'not_applicable' =
      'not_applicable'
    let fallbackActive = false

    // SQLite 상태 확인 (SQLite를 사용하는 경우만)
    if (!isSupabasePrimary) {
      try {
        const { getDatabase } = await import('@/lib/database')
        getDatabase()
        sqliteStatus = 'connected'
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.warn(`[Health] SQLite connection failed: ${errorMsg}`)
        sqliteStatus = 'disconnected'
      }
    }

    // Supabase 연결 확인
    if (
      env.USE_SUPABASE ||
      env.DB_READ_MODE === 'supabase' ||
      env.DB_WRITE_MODE === 'supabase'
    ) {
      try {
        const supabase = getSupabaseClient()
        const { error } = await supabase.from('searches').select('id').limit(1)

        if (error) {
          throw error
        }

        supabaseStatus = 'connected'
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.warn(`[Health] Supabase connection failed: ${errorMsg}`)

        // Fallback active if READ_MODE is supabase
        if (env.DB_READ_MODE === 'supabase') {
          supabaseStatus = 'fallback'
          fallbackActive = true
        } else {
          supabaseStatus = 'disconnected'
        }
      }
    }

    // Determine status based on database health
    let status: 'ok' | 'partial' | 'error' = 'ok'
    if (isSupabasePrimary) {
      // Phase 5: Supabase Primary 모드
      status =
        supabaseStatus === 'connected'
          ? 'ok'
          : supabaseStatus === 'fallback'
            ? 'partial'
            : 'error'
    } else {
      // SQLite Primary 또는 Dual-write 모드
      if (sqliteStatus !== 'connected') {
        status = 'error'
      } else if (supabaseStatus === 'fallback' || fallbackActive) {
        status = 'partial'
      }
    }

    return Response.json(
      {
        status,
        timestamp: new Date().toISOString(),
        database: {
          primary: primaryMode,
          supabase: supabaseStatus,
          sqlite: sqliteStatus,
          fallback_active: fallbackActive,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[Health] Error checking database health: ${errorMsg}`)

    return Response.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: errorMsg,
      },
      { status: 500 }
    )
  }
}
