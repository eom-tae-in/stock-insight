/**
 * DB CRUD 레이어 - Supabase 위임 레이어 (재설계)
 *
 * 새 스키마에 맞춘 모든 쿼리 함수
 */

import type {
  SearchRecord,
  PriceDataPoint,
  KeywordStockOverlay,
  KeywordAnalysis,
  Region,
  Period,
  SearchType,
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

// ============ keyword_stock_overlays (오버레이) ============
export const addStockOverlay = async (
  keywordSearchId: string,
  ticker: string,
  companyName: string,
  displayOrder?: number,
  client?: SupabaseClient
): Promise<string> =>
  db.addStockOverlay(keywordSearchId, ticker, companyName, displayOrder, client)

export const getKeywordStockOverlays = async (
  keywordSearchId: string,
  client?: SupabaseClient
): Promise<KeywordStockOverlay[]> =>
  db.getKeywordStockOverlays(keywordSearchId, client)

export const removeStockOverlay = async (
  overlayId: string,
  client?: SupabaseClient
): Promise<boolean> => db.removeStockOverlay(overlayId, client)

export const updateStockOverlayOrder = async (
  overlayId: string,
  newDisplayOrder: number,
  client?: SupabaseClient
): Promise<boolean> =>
  db.updateStockOverlayOrder(overlayId, newDisplayOrder, client)

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

// ============ keyword_analysis (조건 조합 기반) ============
export const getKeywordAnalysisByFilters = async (
  keywordId: string,
  region: Region,
  period: Period,
  searchType: SearchType,
  userId?: string,
  client?: SupabaseClient
): Promise<KeywordAnalysis | null> =>
  db.getKeywordAnalysisByFilters(
    keywordId,
    region,
    period,
    searchType,
    userId,
    client
  )

export const getAllKeywordAnalyses = async (
  userId: string,
  client?: SupabaseClient
): Promise<KeywordAnalysis[]> => db.getAllKeywordAnalyses(userId, client)

export const getKeywordAnalysesByKeywordId = async (
  keywordId: string,
  userId: string,
  client?: SupabaseClient
): Promise<
  Array<{ id: string; region: Region; period: Period; search_type: SearchType }>
> => db.getKeywordAnalysesByKeywordId(keywordId, userId, client)

export const createKeywordAnalysis = async (
  data: Omit<KeywordAnalysis, 'id' | 'created_at' | 'updated_at'>,
  client?: SupabaseClient
): Promise<string> => db.createKeywordAnalysis(data, client)

export const updateKeywordAnalysis = async (
  id: string,
  data: Partial<
    Omit<
      KeywordAnalysis,
      'id' | 'keyword_id' | 'region' | 'period' | 'search_type' | 'created_at'
    >
  >,
  client?: SupabaseClient
): Promise<boolean> => db.updateKeywordAnalysis(id, data, client)

export const deleteKeywordAnalysis = async (
  id: string,
  client?: SupabaseClient
): Promise<boolean> => db.deleteKeywordAnalysis(id, client)
