import { z } from 'zod'

/**
 * 환경 변수 검증 스키마
 * Phase 1: SQLite (USE_SUPABASE=false)
 * Phase 2+: Supabase (USE_SUPABASE=true) - SUPABASE_URL/KEY 필수
 */
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    FINNHUB_API_KEY: z
      .string()
      .optional()
      .describe(
        'Finnhub API 키 (https://finnhub.io 발급) - 없으면 Yahoo Finance 폴백'
      ),
    USE_SUPABASE: z
      .enum(['true', 'false'])
      .default('false')
      .transform(val => val === 'true')
      .describe(
        'Supabase 사용 여부 (true: Supabase, false: SQLite) - Phase 1에서는 false 권장'
      ),
    SUPABASE_URL: z
      .string()
      .url()
      .optional()
      .describe(
        'Supabase 프로젝트 URL (https://YOUR_PROJECT_ID.supabase.co) - USE_SUPABASE=true일 때 필수'
      ),
    SUPABASE_KEY: z
      .string()
      .optional()
      .describe(
        'Supabase 공개 API 키 (anon key) - Supabase Dashboard Settings → API에서 확인 - USE_SUPABASE=true일 때 필수'
      ),
  })
  .superRefine((data, ctx) => {
    // USE_SUPABASE=true일 때 SUPABASE_URL과 SUPABASE_KEY는 필수
    if (data.USE_SUPABASE) {
      if (!data.SUPABASE_URL || data.SUPABASE_URL.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['SUPABASE_URL'],
          message: 'USE_SUPABASE=true일 때 SUPABASE_URL은 필수입니다',
        })
      }
      if (!data.SUPABASE_KEY || data.SUPABASE_KEY.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['SUPABASE_KEY'],
          message: 'USE_SUPABASE=true일 때 SUPABASE_KEY는 필수입니다',
        })
      }
    }
  })

/**
 * 환경 변수 검증 및 파싱
 */
function validateEnv() {
  try {
    return envSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
      USE_SUPABASE: process.env.USE_SUPABASE,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_KEY,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      // 모든 검증 실패 이슈를 명확하게 표시
      const issues = error.issues
        .map(issue => {
          const path = issue.path.length > 0 ? issue.path.join('.') : 'root'
          return `  ✗ ${path}: ${issue.message}`
        })
        .join('\n')

      const errorMessage = `❌ 환경 변수 검증 실패:\n${issues}`
      console.error(errorMessage)
      throw new Error('환경 변수 검증 실패. 위의 오류 메시지를 확인하세요.')
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
