/**
 * 공통 API 응답 래퍼 타입
 */

/**
 * 성공 응답 래퍼
 */
export interface ApiResponse<T = unknown> {
  success: true
  data: T
  timestamp: string // ISO 8601
}

/**
 * 실패 응답 래퍼
 */
export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  timestamp: string // ISO 8601
}

/**
 * 통합 응답 타입 (성공/실패)
 */
export type ApiResult<T = unknown> = ApiResponse<T> | ApiErrorResponse

/**
 * 페이지네이션 지원 응답
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * 비동기 작업 상태
 */
export type AsyncStatus = 'idle' | 'pending' | 'success' | 'error'

/**
 * 비동기 작업 상태 객체
 */
export interface AsyncState<T> {
  status: AsyncStatus
  data: T | null
  error: Error | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
}
