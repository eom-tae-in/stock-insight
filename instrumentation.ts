/**
 * Instrumentation Hook
 * Next.js 15 권장 패턴: 앱 초기화를 instrumentation.ts에서 수행
 *
 * 참고: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.WEB_AUTH_MODE === 'oidc') {
    const { oidcConfig } = await import('@/server/oidc/config')
    oidcConfig()
    return
  }
  const { initializeApp } = await import('@/lib/env')

  try {
    await initializeApp()
  } catch (error) {
    console.warn('앱 초기화 경고:', error)
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
  }
}
