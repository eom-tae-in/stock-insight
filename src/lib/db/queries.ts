/**
 * DB CRUD 레이어 - Supabase 위임 레이어
 *
 * Phase 6: Supabase 단일 기반
 * 모든 DB 작업을 adapters/db.ts의 supabaseAdapter를 통해 수행합니다.
 *
 * 이 레이어는 호출부를 adapters/db.ts로부터 분리하는 추상화 계층입니다.
 * 모든 메서드는 async이며, Server Component와 API Route에서 호출됩니다.
 */

import { SearchRecord, PriceDataPoint, TrendsDataPoint } from '@/types/database'
import { db } from '../adapters/db'

// searches 테이블 CRUD
export const upsertSearch = async (record: SearchRecord): Promise<string> =>
  db.upsertSearch(record)

export const getSearchById = async (
  searchId: string
): Promise<SearchRecord | null> => db.getSearch(searchId)

export const getSearchByTicker = async (
  ticker: string
): Promise<SearchRecord | null> => db.getSearchByTicker(ticker)

export const getAllSearches = async (): Promise<SearchRecord[]> =>
  db.getAllSearches()

export const deleteSearch = async (searchId: string): Promise<boolean> =>
  db.deleteSearch(searchId)

// price_data 테이블 CRUD
export const insertPriceData = async (
  searchId: string,
  priceData: PriceDataPoint[]
): Promise<void> => db.insertPriceData(searchId, priceData)

export const getPriceDataBySearchId = async (
  searchId: string
): Promise<PriceDataPoint[]> => db.getPriceDataBySearchId(searchId)

// trends_data 테이블 CRUD
export const insertTrendsData = async (
  searchId: string,
  trendsData: TrendsDataPoint[]
): Promise<void> => db.insertTrendsData(searchId, trendsData)

export const getTrendsDataBySearchId = async (
  searchId: string
): Promise<TrendsDataPoint[]> => db.getTrendsDataBySearchId(searchId)

/**
 * 종목 데이터 완전 교체 (주가 + 트렌드)
 *
 * Supabase 클라이언트는 분산 트랜잭션을 지원하지 않으므로,
 * 이 함수는 두 작업을 순차적으로 호출합니다.
 * insertPriceData/insertTrendsData 중 하나가 실패하면 부분 저장 상태가 될 수 있습니다.
 * 호출부(API 핸들러)에서 보상 로직을 구현하여 데이터 일관성을 유지합니다.
 */
export async function replaceStockData(
  searchId: string,
  priceData: PriceDataPoint[],
  trendsData: TrendsDataPoint[]
): Promise<void> {
  await insertPriceData(searchId, priceData)
  await insertTrendsData(searchId, trendsData)
}
