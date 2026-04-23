import { z } from 'zod'

/**
 * 환경 변수 검증 스키마
 * Phase 6: Supabase 단일 기반 (SQLite 제거 완료)
 * SUPABASE_URL과 SUPABASE_KEY는 필수 환경 변수입니다.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  SUPABASE_URL: z
    .string()
    .url()
    .describe('Supabase 프로젝트 URL (https://YOUR_PROJECT_ID.supabase.co)'),
  SUPABASE_KEY: z
    .string()
    .describe(
      'Supabase 공개 API 키 (anon key) - Supabase Dashboard Settings → API에서 확인'
    ),
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .describe('Supabase 프로젝트 URL - 클라이언트에서 접근'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .describe('Supabase anon 키 - 클라이언트에서 접근 (OAuth용)'),
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url()
    .optional()
    .describe('Upstash Redis REST URL - 주가/트렌드 데이터 캐시용'),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .optional()
    .describe('Upstash Redis REST 토큰 - 주가/트렌드 데이터 캐시용'),
  STOCK_DATA_CACHE_TTL_SECONDS: z
    .string()
    .optional()
    .describe('주가 데이터 Redis 캐시 TTL 초 단위'),
  TRENDS_CACHE_TTL_SECONDS: z
    .string()
    .optional()
    .describe('pytrends 결과 Redis 캐시 TTL 초 단위'),
  PREVIEW_CACHE_TTL_SECONDS: z
    .string()
    .optional()
    .describe('저장 전 종목 미리보기 Redis 캐시 TTL 초 단위'),
  PYTRENDS_INTERNAL_SECRET: z
    .string()
    .optional()
    .describe('Vercel /api/pytrends 내부 서버 호출 인증 secret'),
})

/**
 * 환경 변수 검증 및 파싱
 */
function validateEnv() {
  try {
    return envSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      STOCK_DATA_CACHE_TTL_SECONDS:
        process.env.STOCK_DATA_CACHE_TTL_SECONDS,
      TRENDS_CACHE_TTL_SECONDS: process.env.TRENDS_CACHE_TTL_SECONDS,
      PREVIEW_CACHE_TTL_SECONDS: process.env.PREVIEW_CACHE_TTL_SECONDS,
      PYTRENDS_INTERNAL_SECRET: process.env.PYTRENDS_INTERNAL_SECRET,
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
 * Phase 6: Supabase 단일 기반이므로 별도 초기화 불필요
 */
export async function initializeApp(): Promise<void> {
  console.log('✓ Supabase 기반 앱 초기화 완료')
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
