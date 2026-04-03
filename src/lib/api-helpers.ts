/**
 * API 응답 공통 헬퍼
 *
 * 모든 API Route에서 일관된 응답 형식을 제공합니다.
 */

import { NextResponse } from 'next/server'
import type { ApiResponse, ApiErrorResponse } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 성공 응답 생성
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  }
  return NextResponse.json(response, { status })
}

/**
 * 에러 응답 생성
 *
 * development 환경에서만 상세 오류 정보를 포함합니다.
 * 프로덕션 환경에서는 내부 정보 노출을 방지합니다.
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  const isDev = process.env.NODE_ENV === 'development'

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(isDev && details && { details }),
    },
    timestamp: new Date().toISOString(),
  }
  return NextResponse.json(response, { status })
}

/**
 * API 인증 검증 헬퍼
 *
 * API 라우트에서 인증된 사용자 확인이 필요할 때 사용합니다.
 * 미인증 상태면 401 응답을 반환하고, 인증된 사용자의 ID를 반환합니다.
 *
 * @param supabase - Supabase 서버 클라이언트
 * @returns {Promise<{userId: string} | NextResponse>} 사용자 ID 또는 에러 응답
 *
 * @example
 * const authResult = await validateApiAuth(supabase)
 * if (authResult instanceof NextResponse) {
 *   return authResult // 에러 응답 반환
 * }
 * const { userId } = authResult
 */
export async function validateApiAuth(
  supabase: SupabaseClient
): Promise<{ userId: string } | NextResponse<ApiErrorResponse>> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    return createErrorResponse('UNAUTHORIZED', '로그인이 필요합니다.', 401)
  }

  return { userId: user.id }
}
