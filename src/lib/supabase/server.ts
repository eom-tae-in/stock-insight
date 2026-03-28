/**
 * 서버 클라이언트 - Next.js Server Component / API Route용
 * 쿠키 기반 세션 자동 연동
 * 각 요청마다 새로운 인스턴스 생성 (싱글톤 아님)
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 setAll 실행 불가
            // Middleware가 세션 갱신을 담당하므로 에러 무시
          }
        },
      },
    }
  )
}
