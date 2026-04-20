import type { SupabaseClient } from '@supabase/supabase-js'
import {
  addStockOverlay,
  getKeywordStockOverlays,
  getOverlayChartTimeseries,
  insertOverlayChartTimeseries,
  removeStockOverlay,
  removeStockOverlaysBatch,
  updateStockOverlayOrder,
} from '@/lib/db/queries'
import { fetchCachedStockData } from '@/server/cached-stock-service'

export class ApiServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
  }
}

type PricePoint = {
  date: string
  price: number
}

type OverlayBody = {
  ticker?: string
  companyName?: string
  company_name?: string
  priceData?: PricePoint[]
}

function assertKeywordId(keywordId: string) {
  if (!keywordId) {
    throw new ApiServiceError('INVALID_ID', '유효하지 않은 ID입니다.', 400)
  }
}

function normalizeOverlayData(priceData: PricePoint[]) {
  const prices = priceData.map(point => point.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const range = maxPrice - minPrice

  return priceData.map(point => ({
    date: point.date,
    rawPrice: point.price,
    normalizedPrice: range > 0 ? ((point.price - minPrice) / range) * 100 : 50,
  }))
}

async function formatOverlay(
  supabase: SupabaseClient,
  overlay: {
    id: string
    ticker: string
    company_name: string
    display_order: number
    created_at?: string
  }
) {
  return {
    id: overlay.id,
    ticker: overlay.ticker,
    company_name: overlay.company_name,
    companyName: overlay.company_name,
    display_order: overlay.display_order,
    displayOrder: overlay.display_order,
    created_at: overlay.created_at,
    chartData: await getOverlayChartTimeseries(overlay.id, supabase),
  }
}

export async function listKeywordOverlays(
  supabase: SupabaseClient,
  keywordId: string
) {
  assertKeywordId(keywordId)

  const overlays = await getKeywordStockOverlays(keywordId, supabase)
  return Promise.all(overlays.map(overlay => formatOverlay(supabase, overlay)))
}

export async function createKeywordOverlay(
  supabase: SupabaseClient,
  keywordId: string,
  body: OverlayBody
) {
  assertKeywordId(keywordId)

  if (!body.ticker) {
    throw new ApiServiceError('INVALID_BODY', 'ticker는 필수입니다.', 400)
  }

  const ticker = body.ticker.trim().toUpperCase()
  const companyName = body.companyName ?? body.company_name ?? ticker
  const overlayId = await addStockOverlay(
    keywordId,
    ticker,
    companyName,
    0,
    supabase
  )

  let priceData = body.priceData
  if (!priceData || priceData.length === 0) {
    const stockData = await fetchCachedStockData(ticker)
    priceData = stockData.priceData.map(point => ({
      date: point.date,
      price: point.close,
    }))
  }

  if (priceData.length > 0) {
    await insertOverlayChartTimeseries(
      overlayId,
      normalizeOverlayData(priceData),
      supabase
    )
  }

  return {
    id: overlayId,
    ticker,
    companyName,
    displayOrder: 0,
    chartData: await getOverlayChartTimeseries(overlayId, supabase),
  }
}

export async function updateKeywordOverlayOrder(
  supabase: SupabaseClient,
  keywordId: string,
  orderedIds: string[]
) {
  assertKeywordId(keywordId)

  if (!Array.isArray(orderedIds)) {
    throw new ApiServiceError(
      'INVALID_BODY',
      'orderedIds는 배열이어야 합니다.',
      400
    )
  }

  const overlays = await getKeywordStockOverlays(keywordId, supabase)
  const ownedOverlayIds = new Set(overlays.map(overlay => overlay.id))

  if (orderedIds.some(id => !ownedOverlayIds.has(id))) {
    throw new ApiServiceError(
      'NOT_FOUND',
      '수정할 수 없는 오버레이가 포함되어 있습니다.',
      404
    )
  }

  for (let index = 0; index < orderedIds.length; index++) {
    const updated = await updateStockOverlayOrder(
      orderedIds[index],
      index,
      supabase
    )

    if (!updated) {
      throw new ApiServiceError(
        'DB_ERROR',
        '순서 업데이트에 실패했습니다.',
        500
      )
    }
  }

  return listKeywordOverlays(supabase, keywordId)
}

export async function deleteKeywordOverlay(
  supabase: SupabaseClient,
  keywordId: string,
  overlayId: string
) {
  assertKeywordId(keywordId)

  if (!overlayId) {
    throw new ApiServiceError('INVALID_ID', '유효하지 않은 ID입니다.', 400)
  }

  const overlays = await getKeywordStockOverlays(keywordId, supabase)
  const targetOverlay = overlays.find(overlay => overlay.id === overlayId)

  if (!targetOverlay) {
    throw new ApiServiceError('NOT_FOUND', '오버레이를 찾을 수 없습니다.', 404)
  }

  const deleted = await removeStockOverlay(overlayId, supabase)
  if (!deleted) {
    throw new ApiServiceError(
      'DELETE_FAILED',
      '오버레이를 삭제하지 못했습니다.',
      500
    )
  }

  return { success: true }
}

export async function refreshKeywordOverlay(
  supabase: SupabaseClient,
  keywordId: string,
  overlayId: string
) {
  assertKeywordId(keywordId)

  if (!overlayId) {
    throw new ApiServiceError('INVALID_ID', '유효하지 않은 ID입니다.', 400)
  }

  const overlays = await getKeywordStockOverlays(keywordId, supabase)
  const overlay = overlays.find(item => item.id === overlayId)

  if (!overlay) {
    throw new ApiServiceError('NOT_FOUND', '오버레이를 찾을 수 없습니다.', 404)
  }

  const stockData = await fetchCachedStockData(overlay.ticker)
  const overlayData = normalizeOverlayData(
    stockData.priceData.map(point => ({
      date: point.date,
      price: point.close,
    }))
  )

  await insertOverlayChartTimeseries(overlayId, overlayData, supabase)

  return { success: true, updated: overlayData.length }
}

export async function batchDeleteKeywordOverlays(
  supabase: SupabaseClient,
  keywordId: string,
  overlayIds: string[]
) {
  assertKeywordId(keywordId)

  if (!Array.isArray(overlayIds) || overlayIds.length === 0) {
    throw new ApiServiceError(
      'INVALID_REQUEST',
      'overlayIds 배열이 필요합니다.',
      400
    )
  }

  if (overlayIds.length > 100) {
    throw new ApiServiceError(
      'INVALID_REQUEST',
      '최대 100개까지만 삭제 가능합니다.',
      400
    )
  }

  const overlays = await getKeywordStockOverlays(keywordId, supabase)
  const ownedOverlayIds = new Set(overlays.map(overlay => overlay.id))
  const validOverlayIds = overlayIds.filter(id => ownedOverlayIds.has(id))

  if (validOverlayIds.length !== overlayIds.length) {
    throw new ApiServiceError(
      'NOT_FOUND',
      '삭제할 수 없는 오버레이가 포함되어 있습니다.',
      404
    )
  }

  const success = await removeStockOverlaysBatch(validOverlayIds, supabase)
  if (!success) {
    throw new ApiServiceError(
      'DELETE_FAILED',
      '일부 오버레이 삭제에 실패했습니다.',
      500
    )
  }

  return { deletedCount: validOverlayIds.length }
}
