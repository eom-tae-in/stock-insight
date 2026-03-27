/**
 * DB CRUD 레이어 - ROADMAP 네이밍 컨벤션
 *
 * db-helpers.ts의 함수들을 alias re-export하여
 * ROADMAP Task 008의 네이밍 표준을 준수합니다.
 */

import { PriceDataPoint, TrendsDataPoint } from '@/types/database'
import {
  withTransaction,
  upsertSearchRecord,
  getSearchRecord,
  getSearchRecordByTicker,
  getAllSearchRecords,
  deleteSearchRecord,
  savePriceData,
  getPriceData,
  saveTrendsData,
  getTrendsData,
} from '../db-helpers'

// searches 테이블 CRUD
export const upsertSearch = upsertSearchRecord
export const getSearchById = getSearchRecord
export const getAllSearches = getAllSearchRecords
export const getSearchByTicker = getSearchRecordByTicker
export const deleteSearch = deleteSearchRecord

// price_data 테이블 CRUD
export const insertPriceData = savePriceData
export const getPriceDataBySearchId = getPriceData

// trends_data 테이블 CRUD
export const insertTrendsData = saveTrendsData
export const getTrendsDataBySearchId = getTrendsData

// 트랜잭션 헬퍼
export { withTransaction }

/**
 * 종목 데이터 완전 교체 (주가 + 트렌드)
 * savePriceData/saveTrendsData 각각이 내부적으로 트랜잭션을 관리하므로,
 * 이 함수는 단순히 두 작업을 순차적으로 호출합니다.
 */
export function replaceStockData(
  searchId: string,
  priceData: PriceDataPoint[],
  trendsData: TrendsDataPoint[]
): void {
  savePriceData(searchId, priceData)
  saveTrendsData(searchId, trendsData)
}
