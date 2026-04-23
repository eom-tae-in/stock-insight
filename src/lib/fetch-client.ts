/**
 * 클라이언트 사이드 fetch 래퍼
 *
 * 공통 관심사 처리:
 * - 401 응답 시 /login 으로 자동 리디렉션
 * - 비-2xx 응답 시 응답 본문의 message를 포함한 Error throw
 */

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string = 'API_ERROR',
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

/**
 * fetch를 래핑하여 공통 에러 처리를 적용합니다.
 *
 * @throws {Error} 401 → window.location.href = '/login' 후 리턴 (resolve)
 * @throws {Error} 기타 비-2xx → 응답 메시지 포함 Error
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init)

  if (res.status === 401) {
    const next = `${window.location.pathname}${window.location.search}`
    window.location.href = `/login?next=${encodeURIComponent(next)}`
    // 호출부에서 추가 처리를 막기 위해 pending Promise 반환
    return new Promise(() => {})
  }

  return res
}

/**
 * apiFetch + JSON 파싱을 한 번에 처리합니다.
 *
 * @throws {Error} 비-2xx 응답 시 서버 message 포함 Error throw
 */
export async function apiFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await apiFetch(input, init)

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const errorBody = body as {
      message?: string
      error?: {
        code?: string
        message?: string
        details?: Record<string, unknown>
      }
    }

    throw new ApiRequestError(
      errorBody.error?.message ?? errorBody.message ?? `HTTP ${res.status}`,
      res.status,
      errorBody.error?.code ?? 'API_ERROR',
      errorBody.error?.details
    )
  }

  const body = await res.json()
  return (body.data ?? body) as T
}
