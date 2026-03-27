import { z } from 'zod'

/**
 * 환경 변수 검증 스키마
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  SERPAPI_KEY: z
    .string()
    .min(1, 'SERPAPI_KEY는 필수입니다')
    .describe('Google Trends API 키 (https://serpapi.com 발급)'),
})

/**
 * 환경 변수 검증 및 파싱
 */
function validateEnv() {
  try {
    return envSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      SERPAPI_KEY: process.env.SERPAPI_KEY,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const missing = error.issues
        .filter(
          issue => issue.code === 'too_small' || issue.message.includes('필수')
        )
        .map(issue => `- ${String(issue.path.join('.'))}: ${issue.message}`)
        .join('\n')

      console.error(`❌ 환경 변수 검증 실패:\n${missing}\n`)
      console.error('💡 .env 파일을 생성하거나 다음 변수를 설정하세요:')
      console.error('  SERPAPI_KEY=your_api_key\n')

      throw new Error('필수 환경 변수가 설정되지 않았습니다')
    }
    throw error
  }
}

export const env = validateEnv()

export type Env = z.infer<typeof envSchema>

/**
 * 앱 초기화
 * 데이터베이스 및 환경 설정을 초기화합니다
 */
export async function initializeApp(): Promise<void> {
  // 데이터베이스 초기화
  const { getDatabase } = await import('./database')

  try {
    getDatabase()
    console.log('✓ 데이터베이스 초기화 완료')
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error)
    throw error
  }
}

/**
 * 개발 환경 여부 확인
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development'
}

/**
 * 프로덕션 환경 여부 확인
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production'
}

/**
 * 테스트 환경 여부 확인
 */
export function isTest(): boolean {
  return env.NODE_ENV === 'test'
}
