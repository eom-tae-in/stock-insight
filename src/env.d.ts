/**
 * NodeJS 환경 변수 타입 정의
 * process.env의 자동완성과 타입 검사를 지원합니다
 */

declare namespace NodeJS {
  interface ProcessEnv {
    /** Google Trends API 키 (SerpAPI) */
    SERPAPI_KEY: string

    /** 실행 환경 (development, production, test) */
    NODE_ENV?: 'development' | 'production' | 'test'
  }
}
