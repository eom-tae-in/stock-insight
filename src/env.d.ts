/**
 * NodeJS 환경 변수 타입 정의 (Phase 6)
 * process.env의 자동완성과 타입 검사를 지원합니다
 * 검증은 src/lib/env.ts의 Zod 스키마에서 수행됩니다
 */

declare namespace NodeJS {
  interface ProcessEnv {
    /** 실행 환경 (development, production, test) */
    NODE_ENV?: 'development' | 'production' | 'test'

    /** Supabase secret key. 서버/관리자 전용 */
    SUPABASE_SECRET_KEY?: string

    /** 클라이언트에서 접근하는 Supabase URL (필수) */
    NEXT_PUBLIC_SUPABASE_URL: string

    /** Supabase publishable key. 클라이언트에서 접근 */
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string

    /** Upstash Redis REST URL (선택, 주가/트렌드 데이터 캐시용) */
    UPSTASH_REDIS_REST_URL?: string

    /** Upstash Redis REST 토큰 (선택, 주가/트렌드 데이터 캐시용) */
    UPSTASH_REDIS_REST_TOKEN?: string

    /** 주가 데이터 Redis 캐시 TTL 초 단위 (기본 86400) */
    STOCK_DATA_CACHE_TTL_SECONDS?: string

    /** pytrends 결과 Redis 캐시 TTL 초 단위 (기본 86400) */
    TRENDS_CACHE_TTL_SECONDS?: string

    /** Vercel /api/pytrends 내부 서버 호출 인증 secret */
    PYTRENDS_INTERNAL_SECRET?: string

    /** 관리자 접근 허용 이메일 목록. 쉼표로 구분 */
    ADMIN_EMAILS?: string

    /** Vercel 런타임 표시 (Vercel 환경에서 자동 주입) */
    VERCEL?: string

    /** 현재 deployment hostname (Vercel 환경에서 자동 주입, scheme 없음) */
    VERCEL_URL?: string

    /** Vercel 환경 이름 (production, development) */
    VERCEL_ENV?: string
  }
}
