/**
 * Next.js Middleware
 * 역할:
 * 1. 모든 요청에서 세션 쿠키를 자동 갱신 (refresh token rotation)
 * 2. 미인증 사용자를 보호된 경로에서 /login으로 리디렉션
 * 3. 인증된 사용자가 /login에 접근하면 /로 리디렉션
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware-client'

// 인증 없이 접근 가능한 경로
const PUBLIC_PATHS = ['/login', '/signup', '/api/auth/callback', '/api/health']

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  // Supabase 미들웨어 클라이언트로 세션 갱신
  const supabase = createSupabaseMiddlewareClient(request, response)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 공개 경로 확인
  const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // 미인증 + 보호된 경로 → 로그인 페이지로 리디렉션
  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 인증된 상태에서 /login 또는 /signup 접근 → 대시보드로 리디렉션
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // 모든 경로 매칭 (정적 자산 제외)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
