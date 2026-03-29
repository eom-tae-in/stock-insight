/**
 * 트렌드 데이터 필터링 유틸리티
 * 5년 전체 데이터에서 기간별로 필터링/슬라이싱
 */

import { format, startOfISOWeek } from 'date-fns'
import type { TrendsDataPoint } from '@/types/database'
import type { Timeframe } from '@/lib/constants/trends'
import { TIMEFRAME_DAYS } from '@/lib/constants/trends'

/**
 * 오늘 기준 N일 이내 데이터 반환
 * 문자열 비교로 O(n) 처리 (ISO 8601 형식이므로 문자 비교 = 날짜 비교)
 */
export function filterTrendsByDays(
  allData: TrendsDataPoint[],
  days: number
): TrendsDataPoint[] {
  if (allData.length === 0) return []

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = format(startOfISOWeek(cutoff), 'yyyy-MM-dd')

  return allData.filter(point => point.date >= cutoffStr)
}

/**
 * 최근 N개 포인트 반환 ('주간' 처리용)
 * 5년 데이터는 주간 단위이므로, 최근 4개 포인트 = 약 4주
 */
export function filterTrendsByCount(
  allData: TrendsDataPoint[],
  count: number
): TrendsDataPoint[] {
  if (allData.length === 0) return []
  return allData.slice(Math.max(0, allData.length - count))
}

/**
 * timeframe 분기 통합 필터링
 * 주어진 timeframe과 customWeeks에 따라 적절한 필터링 적용
 */
export function filterTrendsForTimeframe(
  allData: TrendsDataPoint[],
  timeframe: Timeframe | 'custom',
  customWeeks?: number
): TrendsDataPoint[] {
  // 데이터 없음
  if (allData.length === 0) return []

  // 커스텀 기간
  if (timeframe === 'custom') {
    const weeks = Math.max(1, customWeeks ?? 26)
    return filterTrendsByDays(allData, weeks * 7)
  }

  // 최근 4주 (약 4개 포인트)
  if (timeframe === 'w') {
    return filterTrendsByCount(allData, 4)
  }

  // 표준 타임프레임 (1y, 2y, 3y, 4y, 5y)
  const days = TIMEFRAME_DAYS[timeframe]
  if (!days) return allData

  return filterTrendsByDays(allData, days)
}
