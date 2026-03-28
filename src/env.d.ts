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
  }
}
