/**
 * NodeJS 환경 변수 타입 정의 (Phase 6)
 * process.env의 자동완성과 타입 검사를 지원합니다
 * 검증은 src/lib/env.ts의 Zod 스키마에서 수행됩니다
 */

declare namespace NodeJS {
  interface ProcessEnv {
    /** 실행 환경 (development, production, test) */
    NODE_ENV?: 'development' | 'production' | 'test'

    /** Finnhub API 키 (선택 사항, Yahoo Finance 폴백 가능) */
    FINNHUB_API_KEY?: string

    /** Supabase 프로젝트 URL (필수) */
    SUPABASE_URL: string

    /** Supabase 공개 API 키 (anon key, 필수) */
    SUPABASE_KEY: string

    /** 클라이언트에서 접근하는 Supabase URL (필수) */
    NEXT_PUBLIC_SUPABASE_URL: string

    /** 클라이언트에서 접근하는 Supabase anon key (필수) */
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string

    /** Upstash Redis REST URL (선택, 주가/트렌드 데이터 캐시용) */
    UPSTASH_REDIS_REST_URL?: string

    /** Upstash Redis REST 토큰 (선택, 주가/트렌드 데이터 캐시용) */
    UPSTASH_REDIS_REST_TOKEN?: string

    /** 주가 데이터 Redis 캐시 TTL 초 단위 (기본 86400) */
    STOCK_DATA_CACHE_TTL_SECONDS?: string

    /** pytrends 결과 Redis 캐시 TTL 초 단위 (기본 86400) */
    TRENDS_CACHE_TTL_SECONDS?: string

    /** 저장 전 종목 미리보기 Redis 캐시 TTL 초 단위 (기본 86400) */
    PREVIEW_CACHE_TTL_SECONDS?: string

    /** Vercel 런타임 표시 (Vercel 환경에서 자동 주입) */
    VERCEL?: string

    /** 현재 deployment hostname (Vercel 환경에서 자동 주입, scheme 없음) */
    VERCEL_URL?: string
  }
}
