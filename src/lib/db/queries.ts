/**
 * DB CRUD 레이어 - Supabase 위임 레이어
 *
 * Phase 6: Supabase 단일 기반 + Phase 7: 인증된 클라이언트 지원
 * 모든 DB 작업을 adapters/db.ts의 supabaseAdapter를 통해 수행합니다.
 *
 * 이 레이어는 호출부를 adapters/db.ts로부터 분리하는 추상화 계층입니다.
 * 모든 메서드는 async이며, Server Component와 API Route에서 호출됩니다.
 *
 * Optional client 파라미터: 인증된 Supabase 클라이언트를 전달 가능
 * (API Route에서 user_id 기반 RLS 적용을 위해 필요)
 */

import {
  SearchRecord,
  PriceDataPoint,
  TrendsDataPoint,
  KeywordSearchRecord,
  KeywordStockOverlay,
} from '@/types/database'
import { db } from '../adapters/db'
import { SupabaseClient } from '@supabase/supabase-js'

// searches 테이블 CRUD
export const upsertSearch = async (
  record: SearchRecord,
  client?: SupabaseClient
): Promise<string> => db.upsertSearch(record, client)

export const getSearchById = async (
  searchId: string,
  client?: SupabaseClient
): Promise<SearchRecord | null> => db.getSearch(searchId, client)

export const getSearchByTicker = async (
  ticker: string,
  client?: SupabaseClient
): Promise<SearchRecord | null> => db.getSearchByTicker(ticker, client)

export const getAllSearches = async (
  client?: SupabaseClient
): Promise<SearchRecord[]> => db.getAllSearches(client)

export const deleteSearch = async (
  searchId: string,
  client?: SupabaseClient
): Promise<boolean> => db.deleteSearch(searchId, client)

// price_data 테이블 CRUD
export const insertPriceData = async (
  searchId: string,
  priceData: PriceDataPoint[],
  client?: SupabaseClient
): Promise<void> => db.insertPriceData(searchId, priceData, client)

export const getPriceDataBySearchId = async (
  searchId: string,
  client?: SupabaseClient
): Promise<PriceDataPoint[]> => db.getPriceDataBySearchId(searchId, client)

// trends_data 테이블 CRUD
export const insertTrendsData = async (
  searchId: string,
  trendsData: TrendsDataPoint[],
  client?: SupabaseClient
): Promise<void> => db.insertTrendsData(searchId, trendsData, client)

export const getTrendsDataBySearchId = async (
  searchId: string,
  client?: SupabaseClient
): Promise<TrendsDataPoint[]> => db.getTrendsDataBySearchId(searchId, client)

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
  trendsData: TrendsDataPoint[],
  client?: SupabaseClient
): Promise<void> {
  await insertPriceData(searchId, priceData, client)
  await insertTrendsData(searchId, trendsData, client)
}

// ============================================================================
// keyword_searches 테이블 CRUD
// ============================================================================

export const upsertKeywordSearch = async (
  record: KeywordSearchRecord,
  client?: SupabaseClient
): Promise<string> => db.upsertKeywordSearch(record, client)

export const getKeywordSearchById = async (
  keywordSearchId: string,
  client?: SupabaseClient
): Promise<KeywordSearchRecord | null> =>
  db.getKeywordSearch(keywordSearchId, client)

export const getKeywordSearchByKeyword = async (
  keyword: string,
  client?: SupabaseClient
): Promise<KeywordSearchRecord | null> =>
  db.getKeywordSearchByKeyword(keyword, client)

export const getAllKeywordSearches = async (
  client?: SupabaseClient
): Promise<KeywordSearchRecord[]> => db.getAllKeywordSearches(client)

export const deleteKeywordSearch = async (
  keywordSearchId: string,
  client?: SupabaseClient
): Promise<boolean> => db.deleteKeywordSearch(keywordSearchId, client)

// ============================================================================
// keyword_trends_data 테이블 CRUD
// ============================================================================

export const insertKeywordTrendsData = async (
  keywordSearchId: string,
  trendsData: TrendsDataPoint[],
  client?: SupabaseClient
): Promise<void> =>
  db.insertKeywordTrendsData(keywordSearchId, trendsData, client)

export const getKeywordTrendsDataByKeywordSearchId = async (
  keywordSearchId: string,
  client?: SupabaseClient
): Promise<TrendsDataPoint[]> =>
  db.getKeywordTrendsDataByKeywordSearchId(keywordSearchId, client)

/**
 * 키워드 트렌드 데이터 완전 교체
 */
export async function replaceKeywordTrendsData(
  keywordSearchId: string,
  trendsData: TrendsDataPoint[],
  client?: SupabaseClient
): Promise<void> {
  await insertKeywordTrendsData(keywordSearchId, trendsData, client)
}

// ============================================================================
// keyword_stock_overlays 테이블 CRUD
// ============================================================================

export const addStockOverlay = async (
  keywordSearchId: string,
  searchId: string,
  displayOrder?: number,
  client?: SupabaseClient
): Promise<string> =>
  db.addStockOverlay(keywordSearchId, searchId, displayOrder, client)

export const removeStockOverlay = async (
  overlayId: string,
  client?: SupabaseClient
): Promise<boolean> => db.removeStockOverlay(overlayId, client)

export const getKeywordStockOverlays = async (
  keywordSearchId: string,
  client?: SupabaseClient
): Promise<KeywordStockOverlay[]> =>
  db.getKeywordStockOverlays(keywordSearchId, client)
