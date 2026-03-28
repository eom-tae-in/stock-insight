import { getSupabaseClient } from '@/lib/supabase'

export async function GET() {
  try {
    // Supabase 연결 확인
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('searches').select('id').limit(1)

    if (error) {
      throw error
    }

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
