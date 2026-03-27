/**
 * API 응답 공통 헬퍼
 *
 * 모든 API Route에서 일관된 응답 형식을 제공합니다.
 */

import { NextResponse } from 'next/server'
import type { ApiResponse, ApiErrorResponse } from '@/types'

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
