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
 * 단일 트랜잭션 내에서 기존 데이터를 삭제하고 새 데이터로 교체합니다.
 *
 * NOTE: savePriceData/saveTrendsData는 내부적으로 withTransaction을 호출하므로
 * 중첩 트랜잭션이 발생합니다. better-sqlite3의 db.transaction은 중첩 호출 시
 * 내부 트랜잭션을 savepoint로 처리하여 기능은 동작하지만, 이는 의도하지 않은
 * 아키텍처입니다. 향후 savePriceData/saveTrendsData가 DB 인스턴스를 파라미터로
 * 받도록 리팩토링하여 진정한 원자성을 보장하는 것이 권장됩니다.
 */
export function replaceStockData(
  searchId: string,
  priceData: PriceDataPoint[],
  trendsData: TrendsDataPoint[]
): void {
  withTransaction(() => {
    savePriceData(searchId, priceData)
    saveTrendsData(searchId, trendsData)
  })
}
