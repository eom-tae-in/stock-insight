import { getSupabaseClient } from '@/lib/supabase'
import { checkDatabaseHealth } from '@/server/health-service'

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    await checkDatabaseHealth(supabase)

    return Response.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'supabase',
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[Health] Supabase connection failed: ${errorMsg}`)

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
