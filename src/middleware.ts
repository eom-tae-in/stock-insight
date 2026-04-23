/**
 * Next.js Middleware
 * 역할:
 * 1. 모든 요청에서 세션 쿠키를 자동 갱신 (refresh token rotation)
 * 2. 미인증 사용자를 보호된 페이지에서 /login으로 리디렉션
 * 3. 보호된 API 요청은 401 JSON으로 반환
 * 4. 인증된 사용자가 /login에 접근하면 원래 next 또는 /로 리디렉션
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware-client'

// 인증 없이 접근 가능한 경로
// 참고: /set-password 는 이메일 OTP 인증 완료 후 세션이 있는 사용자만 접근하므로
// 공개 경로에 포함하지 않음 (미들웨어 세션 갱신이 자동 처리)
const PUBLIC_PAGE_PATHS = ['/login', '/signup']
const PUBLIC_API_PATHS = ['/api/auth/callback', '/api/health']
const INTERNAL_API_PATHS = ['/api/pytrends']

function getSafeNextPath(input: string | null): string {
  if (!input || !input.startsWith('/')) return '/'
  if (input.startsWith('//')) return '/'
  return input
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const response = NextResponse.next({ request })

  const isInternalApiPath = INTERNAL_API_PATHS.some(p => pathname.startsWith(p))
  if (isInternalApiPath) {
    return response
  }

  const isApiPath = pathname.startsWith('/api/')
  const isPublicPagePath = PUBLIC_PAGE_PATHS.some(p => pathname.startsWith(p))
  const isPublicApiPath = PUBLIC_API_PATHS.some(p => pathname.startsWith(p))
  const isPublicPath = isApiPath ? isPublicApiPath : isPublicPagePath

  // Supabase 미들웨어 클라이언트로 세션 갱신
  const supabase = createSupabaseMiddlewareClient(request, response)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 미인증 + 보호된 API → 401 JSON
  if (!user && isApiPath && !isPublicPath) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    )
  }

  // 미인증 + 보호된 페이지 → 로그인 페이지로 리디렉션
  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  // 인증된 상태에서 /login 또는 /signup 접근 → 원래 목적지 또는 대시보드로 리디렉션
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const next = getSafeNextPath(request.nextUrl.searchParams.get('next'))
    return NextResponse.redirect(new URL(next, request.url))
  }

  return response
}

export const config = {
  matcher: [
    // 모든 경로 매칭 (정적 자산 제외)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
