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
 * 트랜잭션 내에서 기존 데이터를 삭제하고 새 데이터로 교체합니다.
 */
export function replaceStockData(
  searchId: string,
  priceData: PriceDataPoint[],
  trendsData: TrendsDataPoint[]
): void {
  withTransaction(() => {
    // db-helpers 함수들은 내부적으로 DELETE + INSERT를 이미 처리하므로
    // 여기서는 순차 호출만으로 충분합니다.
    // 만약 완전한 원자성이 필요하면 이 함수 내에서 직접 DB 작업을 수행해야 합니다.
    savePriceData(searchId, priceData)
    saveTrendsData(searchId, trendsData)
  })
}
