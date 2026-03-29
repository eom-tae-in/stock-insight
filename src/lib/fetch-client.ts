/**
 * 클라이언트 사이드 fetch 래퍼
 *
 * 공통 관심사 처리:
 * - 401 응답 시 /login 으로 자동 리디렉션
 * - 비-2xx 응답 시 응답 본문의 message를 포함한 Error throw
 */

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
    window.location.href = '/login'
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
    throw new Error(
      (body as { message?: string }).message ?? `HTTP ${res.status}`
    )
  }

  const body = await res.json()
  return (body.data ?? body) as T
}
