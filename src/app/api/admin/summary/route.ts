import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'
import { validateAdminApiAuth } from '@/server/admin-auth'
import { getAdminSummary } from '@/server/admin-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateAdminApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const summary = await getAdminSummary()
    return createSuccessResponse(summary, 200)
  } catch (error) {
    console.error('관리자 요약 조회 실패:', error)
    return createErrorResponse(
      'ADMIN_SUMMARY_FAILED',
      '관리자 요약을 불러오지 못했습니다.',
      500
    )
  }
}
