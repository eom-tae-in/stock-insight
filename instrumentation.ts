/**
 * Instrumentation Hook
 * Next.js 15 권장 패턴: 앱 초기화를 instrumentation.ts에서 수행
 *
 * 참고: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // 서버 시작 시 앱 초기화 (SQLite 또는 Supabase 설정)
  const { initializeApp } = await import('@/lib/env')

  try {
    await initializeApp()
  } catch (error) {
    console.warn('앱 초기화 경고:', error)
  }
}
