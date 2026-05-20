import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchCachedStockData } from '@/server/cached-stock-service'
import type { OverlayRepository } from './repositories/overlay-repository'
import { SupabaseOverlayRepository } from './repositories/supabase-overlay-repository'

export class AnalysisOverlayServiceError extends Error {
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

type OverlayInput = {
  ticker?: unknown
  company_name?: unknown
  display_order?: unknown
  price_data?: unknown
  region?: unknown
  period?: unknown
  search_type?: unknown
}

type OverlayOrderInput = {
  id?: unknown
  display_order?: unknown
}

async function assertOwnedAnalysis(
  repository: OverlayRepository,
  userId: string,
  analysisId: string
) {
  const analysis = await repository.findOwnedAnalysisFilters(userId, analysisId)

  if (!analysis) {
    throw new AnalysisOverlayServiceError(
      'NOT_FOUND',
      'Analysis를 찾을 수 없습니다.',
      404
    )
  }

  return analysis
}

function normalizeTicker(ticker: unknown): string | null {
  if (typeof ticker !== 'string') return null

  const normalized = ticker.trim().toUpperCase()
  return normalized.length > 0 ? normalized : null
}

function parsePriceData(priceData: unknown): PricePoint[] {
  if (!Array.isArray(priceData)) return []

  return priceData.filter(
    (point): point is PricePoint =>
      typeof point?.date === 'string' && typeof point?.price === 'number'
  )
}

function toTimeseriesRecords(overlayId: string, priceData: PricePoint[]) {
  if (priceData.length === 0) return []

  const prices = priceData.map(point => point.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice

  return priceData.map(point => ({
    overlay_id: overlayId,
    date: point.date,
    raw_price: point.price,
    normalized_price:
      priceRange > 0 ? ((point.price - minPrice) / priceRange) * 100 : 50,
  }))
}

export function createAnalysisOverlayService(repository: OverlayRepository) {
  return {
    async listAnalysisOverlays(userId: string, analysisId: string) {
      await assertOwnedAnalysis(repository, userId, analysisId)
      return repository.findManyByAnalysisId(userId, analysisId)
    },

    async createAnalysisOverlay(
      userId: string,
      analysisId: string,
      input: OverlayInput
    ) {
      const analysis = await assertOwnedAnalysis(repository, userId, analysisId)

      // 필터 검증: 클라이언트에서 보낸 필터와 분석의 필터가 일치하는지 확인
      if (input.region || input.period || input.search_type) {
        const clientRegion = input.region as string
        const clientPeriod = input.period as string
        const clientSearchType = input.search_type as string

        if (
          clientRegion !== analysis.region ||
          clientPeriod !== analysis.period ||
          clientSearchType !== analysis.search_type
        ) {
          throw new AnalysisOverlayServiceError(
            'FILTER_MISMATCH',
            '분석 설정이 변경되었습니다. 페이지를 새로고침한 후 다시 시도하세요.',
            409
          )
        }
      }

      const ticker = normalizeTicker(input.ticker)
      if (
        !ticker ||
        typeof input.company_name !== 'string' ||
        !input.company_name.trim()
      ) {
        throw new AnalysisOverlayServiceError(
          'INVALID_INPUT',
          '필수 필드가 누락되었습니다.',
          400
        )
      }

      let overlayId: string | null = null

      try {
        overlayId = await repository.create({
          analysisId,
          ticker,
          companyName: input.company_name.trim(),
          displayOrder:
            typeof input.display_order === 'number'
              ? input.display_order
              : undefined,
        })

        let priceData = parsePriceData(input.price_data)
        if (priceData.length === 0) {
          const stockData = await fetchCachedStockData(ticker)
          priceData = stockData.priceData.map(point => ({
            date: point.date,
            price: point.close,
          }))
        }

        const records = toTimeseriesRecords(overlayId, priceData)
        await repository.insertTimeseries(records)

        return { id: overlayId }
      } catch (error) {
        if (error instanceof Error && error.message === 'DUPLICATE_OVERLAY') {
          throw new AnalysisOverlayServiceError(
            'DUPLICATE',
            '이미 추가된 종목입니다.',
            409
          )
        }

        if (overlayId) {
          await repository.deleteById(analysisId, overlayId)
        }
        throw error
      }
    },

    async updateAnalysisOverlayOrder(
      userId: string,
      analysisId: string,
      overlays: unknown
    ) {
      await assertOwnedAnalysis(repository, userId, analysisId)

      if (!Array.isArray(overlays) || overlays.length === 0) {
        throw new AnalysisOverlayServiceError(
          'INVALID_INPUT',
          '올바른 overlays 배열이 필요합니다.',
          400
        )
      }

      const parsedOverlays = overlays as OverlayOrderInput[]

      for (const item of parsedOverlays) {
        if (
          typeof item.id !== 'string' ||
          typeof item.display_order !== 'number'
        ) {
          throw new AnalysisOverlayServiceError(
            'INVALID_INPUT',
            '각 overlay는 id와 display_order를 포함해야 합니다.',
            400
          )
        }
      }

      await repository.updateOrder(
        analysisId,
        parsedOverlays.map(item => ({
          id: item.id as string,
          display_order: item.display_order as number,
        }))
      )

      return { success: true }
    },

    async deleteAnalysisOverlay(
      userId: string,
      analysisId: string,
      overlayId: string
    ) {
      await assertOwnedAnalysis(repository, userId, analysisId)
      await repository.deleteById(analysisId, overlayId)

      return { success: true }
    },

    async refreshAnalysisOverlay(
      userId: string,
      analysisId: string,
      overlayId: string
    ) {
      await assertOwnedAnalysis(repository, userId, analysisId)
      const overlay = await repository.findTickerById(analysisId, overlayId)

      if (!overlay) {
        throw new AnalysisOverlayServiceError(
          'NOT_FOUND',
          '오버레이를 찾을 수 없습니다.',
          404
        )
      }

      const stockData = await fetchCachedStockData(overlay.ticker)
      const priceData = stockData.priceData.map(point => ({
        date: point.date,
        price: point.close,
      }))
      const records = toTimeseriesRecords(overlayId, priceData)

      const firstDate = priceData[0]?.date
      await repository.refreshTimeseries({
        analysisId,
        overlayId,
        records,
        pruneBeforeDate: firstDate,
      })

      const overlays = await this.listAnalysisOverlays(userId, analysisId)
      const refreshedOverlay = overlays.find(item => item.id === overlayId)

      if (!refreshedOverlay) {
        throw new AnalysisOverlayServiceError(
          'REFRESH_FAILED',
          '갱신된 오버레이를 다시 조회하지 못했습니다.',
          500
        )
      }

      return refreshedOverlay
    },
  }
}

function createSupabaseAnalysisOverlayService(supabase: SupabaseClient) {
  return createAnalysisOverlayService(new SupabaseOverlayRepository(supabase))
}

export async function listAnalysisOverlays(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
) {
  return createSupabaseAnalysisOverlayService(supabase).listAnalysisOverlays(
    userId,
    analysisId
  )
}

export async function createAnalysisOverlay(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string,
  input: OverlayInput
) {
  return createSupabaseAnalysisOverlayService(supabase).createAnalysisOverlay(
    userId,
    analysisId,
    input
  )
}

export async function updateAnalysisOverlayOrder(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string,
  overlays: unknown
) {
  return createSupabaseAnalysisOverlayService(
    supabase
  ).updateAnalysisOverlayOrder(userId, analysisId, overlays)
}

export async function deleteAnalysisOverlay(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string,
  overlayId: string
) {
  return createSupabaseAnalysisOverlayService(supabase).deleteAnalysisOverlay(
    userId,
    analysisId,
    overlayId
  )
}

export async function refreshAnalysisOverlay(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string,
  overlayId: string
) {
  return createSupabaseAnalysisOverlayService(supabase).refreshAnalysisOverlay(
    userId,
    analysisId,
    overlayId
  )
}
