/**
 * DB CRUD 레이어 - Adapter Pattern
 *
 * 모든 DB 작업을 adapters/db.ts의 어댑터를 통해 수행합니다.
 * Phase 2 마이그레이션: SQLite → Supabase 점진적 전환 시작
 *
 * IMPORTANT: 이 파일의 export 시그니처는 비동기로 업데이트되었습니다.
 * - SQLite와 Supabase를 모두 지원하기 위해 필수
 * - 앱 코드는 모두 Server Component 또는 API Route이므로 async 지원
 * - API 응답 형식은 변경되지 않음 (마이그레이션 원칙 준수)
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
 * insertPriceData/insertTrendsData 각각이 내부적으로 트랜잭션을 관리하므로,
 * 이 함수는 단순히 두 작업을 순차적으로 호출합니다.
 */
export async function replaceStockData(
  searchId: string,
  priceData: PriceDataPoint[],
  trendsData: TrendsDataPoint[]
): Promise<void> {
  await insertPriceData(searchId, priceData)
  await insertTrendsData(searchId, trendsData)
}
