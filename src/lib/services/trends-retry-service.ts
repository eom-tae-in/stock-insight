/**
 * Google Trends API 재시도 로직
 * - Exponential backoff (1s → 2s → 4s)
 * - Jitter 추가 (±0~500ms)
 * - 최대 3회 재시도 (총 4회 시도)
 */

import { callPyTrendsAPI } from '@/lib/services/trends-service'
import type { TrendsDataPoint } from '@/types/database'

export type TrendsErrorType =
  | 'TEMP_FAILURE' // 외부 API 일시 실패 (429, 타임아웃 등)
  | 'NO_DATA' // 유효한 데이터 없음 (검색 결과 0건)
  | 'INVALID_PARAMS' // 입력 파라미터 오류
  | 'UNKNOWN' // 알 수 없는 오류

export interface TrendsError {
  type: TrendsErrorType
  message: string
  timestamp: string
}

export interface TrendsRetryResult {
  success: boolean
  data?: TrendsDataPoint[]
  error?: TrendsError
}

/**
 * 대기 시간 계산 (exponential backoff + jitter)
 * @param attemptNumber 시도 번호 (0부터 시작)
 * @returns 대기 시간 (ms)
 */
function calculateBackoffWithJitter(attemptNumber: number): number {
  // exponential: 2^n 초 (1, 2, 4, ...)
  const baseMs = Math.pow(2, attemptNumber) * 1000

  // jitter: ±0~500ms
  const jitter = Math.random() * 500

  return baseMs + jitter
}

/**
 * 에러 타입 판별
 * @param error 발생한 에러
 * @returns TrendsErrorType
 */
function classifyError(error: unknown): TrendsErrorType {
  const message = error instanceof Error ? error.message : String(error)

  // ========== TrendsProviderError 확인 (type 필드 있음) ==========
  const providerError = error as { type?: string } | undefined
  if (providerError?.type === 'RATE_LIMIT') {
    return 'TEMP_FAILURE'
  }
  if (providerError?.type === 'NO_DATA') {
    return 'NO_DATA'
  }

  // ========== 문자열 기반 폴백 분류 ==========
  // HTTP 429 (Rate Limit)
  if (message.includes('429') || message.includes('rate limit')) {
    return 'TEMP_FAILURE'
  }

  // 타임아웃
  if (
    message.includes('timeout') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ECONNREFUSED')
  ) {
    return 'TEMP_FAILURE'
  }

  // 유효한 데이터 없음
  if (message.includes('No valid') || message.includes('no data')) {
    return 'NO_DATA'
  }

  // 기본값: UNKNOWN
  return 'UNKNOWN'
}

/**
 * 재시도 가능 여부 판별
 * - NO_DATA, INVALID_PARAMS: 재시도 불가
 * - TEMP_FAILURE, UNKNOWN: 재시도 가능
 */
function isRetryable(errorType: TrendsErrorType): boolean {
  return errorType === 'TEMP_FAILURE' || errorType === 'UNKNOWN'
}

/**
 * pytrends 호출 (재시도 로직 포함)
 *
 * 처리 흐름:
 * 1차 시도: 즉시
 * 2차 시도: 1초 + jitter (0~500ms) = 1.0~1.5초 후
 * 3차 시도: 2초 + jitter (0~500ms) = 2.0~2.5초 후
 * 4차 시도: 4초 + jitter (0~500ms) = 4.0~4.5초 후
 *
 * @param keyword 검색 키워드
 * @param geo 지역 (기본값: '')
 * @param timeframe 기간 (기본값: '5y')
 * @param gprop 검색 속성 (기본값: '')
 * @returns { success, data?, error? }
 */
export async function callPyTrendsWithRetry(
  keyword: string,
  geo: string = '',
  timeframe: string = '5y',
  gprop: string = ''
): Promise<TrendsRetryResult> {
  const MAX_RETRIES = 3
  let lastError: TrendsError | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[pytrends 시도 ${attempt + 1}/${MAX_RETRIES + 1}] "${keyword}" (region: ${geo || 'GLOBAL'}, timeframe: ${timeframe}, searchType: ${gprop || 'WEB'})`
      )

      const data = await callPyTrendsAPI(keyword, geo, timeframe, gprop)

      console.log(
        `[pytrends 성공] "${keyword}" - ${data.length}개 데이터포인트`
      )

      return {
        success: true,
        data,
      }
    } catch (error) {
      const errorType = classifyError(error)
      const message = error instanceof Error ? error.message : String(error)

      lastError = {
        type: errorType,
        message,
        timestamp: new Date().toISOString(),
      }

      console.error(
        `[pytrends 실패 ${attempt + 1}/${MAX_RETRIES + 1}] "${keyword}" - ${errorType}: ${message}`
      )

      // 재시도 불가능한 에러면 즉시 반환
      if (!isRetryable(errorType)) {
        console.log(`[pytrends 재시도 불가] 에러 타입: ${errorType}`)
        return {
          success: false,
          error: lastError,
        }
      }

      // 마지막 시도가 아니면 대기 후 재시도
      if (attempt < MAX_RETRIES) {
        const waitMs = calculateBackoffWithJitter(attempt)
        console.log(
          `[pytrends 대기] ${(waitMs / 1000).toFixed(2)}초 후 재시도...`
        )
        await new Promise(resolve => setTimeout(resolve, waitMs))
      }
    }
  }

  // 모든 재시도 실패
  console.error(`[pytrends 최종 실패] "${keyword}" - 최대 재시도 횟수 초과`)

  return {
    success: false,
    error: lastError || {
      type: 'UNKNOWN',
      message: 'All retries exhausted',
      timestamp: new Date().toISOString(),
    },
  }
}
