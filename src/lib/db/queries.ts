/**
 * DB CRUD 레이어 - Supabase 위임 레이어 (재설계)
 *
 * 새 스키마에 맞춘 모든 쿼리 함수
 */

import type {
  SearchRecord,
  PriceDataPoint,
  KeywordSearchRecord,
  KeywordStockOverlay,
} from '@/types/database'
import { db } from '../adapters/db'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============ searches (종목) ============
export const upsertSearch = async (
  record: SearchRecord,
  client?: SupabaseClient
): Promise<string> => db.upsertSearch(record, client)

export const getSearchById = async (
  searchId: string,
  userId: string,
  client?: SupabaseClient
): Promise<SearchRecord | null> => db.getSearch(searchId, userId, client)

export const getSearchByTicker = async (
  ticker: string,
  userId: string,
  client?: SupabaseClient
): Promise<SearchRecord | null> => db.getSearchByTicker(ticker, userId, client)

export const getAllSearches = async (
  userId: string,
  client?: SupabaseClient
): Promise<SearchRecord[]> => db.getAllSearches(userId, client)

export const deleteSearch = async (
  searchId: string,
  client?: SupabaseClient
): Promise<boolean> => db.deleteSearch(searchId, client)

// ============ stock_price_data (주가 시계열) ============
export const insertPriceData = async (
  searchId: string,
  priceData: PriceDataPoint[],
  client?: SupabaseClient
): Promise<void> => db.insertPriceData(searchId, priceData, client)

export const getPriceDataBySearchId = async (
  searchId: string,
  client?: SupabaseClient
): Promise<PriceDataPoint[]> => db.getPriceDataBySearchId(searchId, client)

// ============ keyword_searches (키워드) ============
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

export const markKeywordAsViewed = async (
  keywordSearchId: string,
  client?: SupabaseClient
): Promise<boolean> => db.markKeywordAsViewed(keywordSearchId, client)

// ============ keyword_chart_timeseries (차트 전체 시계열) ============
export const insertKeywordChartTimeseries = async (
  keywordSearchId: string,
  chartData: Array<{
    weekIndex: number
    date: string
    trendsValue: number
    ma13Value: number | null
    yoyValue: number | null
  }>,
  client?: SupabaseClient
): Promise<void> =>
  db.insertKeywordChartTimeseries(keywordSearchId, chartData, client)

export const getKeywordChartTimeseries = async (
  keywordSearchId: string,
  client?: SupabaseClient
): Promise<
  Array<{
    weekIndex: number
    date: string
    trendsValue: number
    ma13Value: number | null
    yoyValue: number | null
  }>
> => db.getKeywordChartTimeseries(keywordSearchId, client)

// ============ keyword_stock_overlays (오버레이) ============
export const addStockOverlay = async (
  keywordSearchId: string,
  searchId: string,
  ticker: string,
  companyName: string,
  displayOrder?: number,
  client?: SupabaseClient
): Promise<string> =>
  db.addStockOverlay(
    keywordSearchId,
    searchId,
    ticker,
    companyName,
    displayOrder,
    client
  )

export const getKeywordStockOverlays = async (
  keywordSearchId: string,
  client?: SupabaseClient
): Promise<KeywordStockOverlay[]> =>
  db.getKeywordStockOverlays(keywordSearchId, client)

export const removeStockOverlay = async (
  overlayId: string,
  client?: SupabaseClient
): Promise<boolean> => db.removeStockOverlay(overlayId, client)

// ============ overlay_chart_timeseries (오버레이 시계열) ============
export const insertOverlayChartTimeseries = async (
  overlayId: string,
  overlayData: Array<{
    date: string
    normalizedPrice: number
    rawPrice: number
  }>,
  client?: SupabaseClient
): Promise<void> =>
  db.insertOverlayChartTimeseries(overlayId, overlayData, client)

export const getOverlayChartTimeseries = async (
  overlayId: string,
  client?: SupabaseClient
): Promise<
  Array<{
    date: string
    normalizedPrice: number
    rawPrice: number
  }>
> => db.getOverlayChartTimeseries(overlayId, client)
