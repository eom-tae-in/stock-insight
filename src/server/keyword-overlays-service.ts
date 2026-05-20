import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchCachedStockData } from '@/server/cached-stock-service'
import type { AnalysisRepository } from './repositories/analysis-repository'
import type { OverlayRepository } from './repositories/overlay-repository'
import { SupabaseAnalysisRepository } from './repositories/supabase-analysis-repository'
import { SupabaseOverlayRepository } from './repositories/supabase-overlay-repository'

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

function formatOverlay(overlay: {
  id: string
  ticker: string
  company_name: string
  display_order: number
  displayOrder?: number
  created_at?: string
  chart_data?: Array<{
    date: string
    normalizedPrice: number | null
    rawPrice: number | null
  }>
}) {
  return {
    id: overlay.id,
    ticker: overlay.ticker,
    company_name: overlay.company_name,
    companyName: overlay.company_name,
    display_order: overlay.display_order,
    displayOrder: overlay.display_order,
    created_at: overlay.created_at,
    chartData: overlay.chart_data ?? [],
  }
}

async function getDefaultAnalysisId(
  analysisRepository: AnalysisRepository,
  userId: string,
  keywordId: string
) {
  const keyword = await analysisRepository.getOwnedKeywordName(
    userId,
    keywordId
  )
  if (!keyword) {
    throw new ApiServiceError('NOT_FOUND', '키워드를 찾을 수 없습니다.', 404)
  }

  const existingAnalysis = await analysisRepository.findByFilters(
    userId,
    keywordId,
    'GLOBAL',
    '5Y',
    'WEB'
  )
  if (existingAnalysis) return existingAnalysis.id

  return analysisRepository.create({
    keyword_id: keywordId,
    region: 'GLOBAL',
    period: '5Y',
    search_type: 'WEB',
    trends_data: [],
  })
}

export function createKeywordOverlayService(
  analysisRepository: AnalysisRepository,
  overlayRepository: OverlayRepository
) {
  const listKeywordOverlays = async (userId: string, keywordId: string) => {
    assertKeywordId(keywordId)

    const analysisId = await getDefaultAnalysisId(
      analysisRepository,
      userId,
      keywordId
    )
    const overlays = await overlayRepository.findManyByAnalysisId(
      userId,
      analysisId
    )

    return overlays.map(formatOverlay)
  }

  return {
    listKeywordOverlays,

    async createKeywordOverlay(
      userId: string,
      keywordId: string,
      body: OverlayBody
    ) {
      assertKeywordId(keywordId)

      if (!body.ticker) {
        throw new ApiServiceError('INVALID_BODY', 'ticker는 필수입니다.', 400)
      }

      const ticker = body.ticker.trim().toUpperCase()
      const companyName = body.companyName ?? body.company_name ?? ticker
      const analysisId = await getDefaultAnalysisId(
        analysisRepository,
        userId,
        keywordId
      )
      const overlayId = await overlayRepository.create({
        analysisId,
        ticker,
        companyName,
        displayOrder: 0,
      })

      let priceData = body.priceData
      if (!priceData || priceData.length === 0) {
        const stockData = await fetchCachedStockData(ticker)
        priceData = stockData.priceData.map(point => ({
          date: point.date,
          price: point.close,
        }))
      }

      if (priceData.length > 0) {
        await overlayRepository.insertTimeseries(
          normalizeOverlayData(priceData).map(point => ({
            overlay_id: overlayId,
            date: point.date,
            normalized_price: point.normalizedPrice,
            raw_price: point.rawPrice,
          }))
        )
      }

      const savedOverlay = (
        await overlayRepository.findManyByAnalysisId(userId, analysisId)
      ).find(overlay => overlay.id === overlayId)

      return {
        id: overlayId,
        ticker,
        companyName,
        displayOrder: 0,
        chartData: savedOverlay?.chart_data ?? [],
      }
    },

    async updateKeywordOverlayOrder(
      userId: string,
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

      const analysisId = await getDefaultAnalysisId(
        analysisRepository,
        userId,
        keywordId
      )
      const overlays = await overlayRepository.findManyByAnalysisId(
        userId,
        analysisId
      )
      const ownedOverlayIds = new Set(overlays.map(overlay => overlay.id))

      if (orderedIds.some(id => !ownedOverlayIds.has(id))) {
        throw new ApiServiceError(
          'NOT_FOUND',
          '수정할 수 없는 오버레이가 포함되어 있습니다.',
          404
        )
      }

      await overlayRepository.updateOrder(
        analysisId,
        orderedIds.map((id, index) => ({ id, display_order: index }))
      )

      return listKeywordOverlays(userId, keywordId)
    },

    async deleteKeywordOverlay(
      userId: string,
      keywordId: string,
      overlayId: string
    ) {
      assertKeywordId(keywordId)

      if (!overlayId) {
        throw new ApiServiceError('INVALID_ID', '유효하지 않은 ID입니다.', 400)
      }

      const analysisId = await getDefaultAnalysisId(
        analysisRepository,
        userId,
        keywordId
      )
      const overlays = await overlayRepository.findManyByAnalysisId(
        userId,
        analysisId
      )
      const targetOverlay = overlays.find(overlay => overlay.id === overlayId)

      if (!targetOverlay) {
        throw new ApiServiceError(
          'NOT_FOUND',
          '오버레이를 찾을 수 없습니다.',
          404
        )
      }

      const deleted = await overlayRepository.deleteById(analysisId, overlayId)
      if (!deleted) {
        throw new ApiServiceError(
          'DELETE_FAILED',
          '오버레이를 삭제하지 못했습니다.',
          500
        )
      }

      return { success: true }
    },
  }
}

function createSupabaseKeywordOverlayService(supabase: SupabaseClient) {
  return createKeywordOverlayService(
    new SupabaseAnalysisRepository(supabase),
    new SupabaseOverlayRepository(supabase)
  )
}

export function listKeywordOverlays(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string
) {
  return createSupabaseKeywordOverlayService(supabase).listKeywordOverlays(
    userId,
    keywordId
  )
}

export function createKeywordOverlay(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string,
  body: OverlayBody
) {
  return createSupabaseKeywordOverlayService(supabase).createKeywordOverlay(
    userId,
    keywordId,
    body
  )
}

export function updateKeywordOverlayOrder(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string,
  orderedIds: string[]
) {
  return createSupabaseKeywordOverlayService(
    supabase
  ).updateKeywordOverlayOrder(userId, keywordId, orderedIds)
}

export function deleteKeywordOverlay(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string,
  overlayId: string
) {
  return createSupabaseKeywordOverlayService(supabase).deleteKeywordOverlay(
    userId,
    keywordId,
    overlayId
  )
}
