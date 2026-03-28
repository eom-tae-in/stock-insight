/**
 * OAuth 콜백 핸들러
 * Google OAuth 인증 완료 후 code를 세션으로 교환
 * GET /api/auth/callback?code=...&next=/path
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 인증 성공 → 지정된 경로로 리디렉션
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 인증 실패 → 로그인 페이지로 리디렉션 (에러 쿼리 파라미터 포함)
  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
