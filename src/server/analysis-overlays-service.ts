import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchCachedStockData } from '@/server/cached-stock-service'

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
  supabase: SupabaseClient,
  analysisId: string,
  userId: string
) {
  const { data: analysis, error: analysisError } = await supabase
    .from('keyword_analysis')
    .select('keyword_id')
    .eq('id', analysisId)
    .single()

  if (analysisError && analysisError.code !== 'PGRST116') throw analysisError
  if (!analysis) {
    throw new AnalysisOverlayServiceError(
      'NOT_FOUND',
      'Analysis를 찾을 수 없습니다.',
      404
    )
  }

  const { data: keyword, error: keywordError } = await supabase
    .from('keywords')
    .select('id')
    .eq('id', analysis.keyword_id)
    .eq('user_id', userId)
    .single()

  if (keywordError && keywordError.code !== 'PGRST116') throw keywordError
  if (!keyword) {
    throw new AnalysisOverlayServiceError(
      'NOT_FOUND',
      'Analysis를 찾을 수 없습니다.',
      404
    )
  }
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

export async function listAnalysisOverlays(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
) {
  await assertOwnedAnalysis(supabase, analysisId, userId)

  const { data, error } = await supabase
    .from('keyword_stock_overlays')
    .select('*, overlay_chart_timeseries(date, normalized_price, raw_price)')
    .eq('analysis_id', analysisId)
    .order('display_order', { ascending: true })

  if (error) throw error

  return (data || []).map(row => ({
    id: row.id,
    analysis_id: row.analysis_id,
    ticker: row.ticker,
    company_name: row.company_name,
    display_order: row.display_order,
    created_at: row.created_at,
    chart_data: (row.overlay_chart_timeseries || [])
      .map(
        (point: {
          date: string
          normalized_price: number | null
          raw_price: number | null
        }) => ({
          date: point.date,
          normalizedPrice: point.normalized_price,
          rawPrice: point.raw_price,
        })
      )
      .sort((a: { date: string }, b: { date: string }) =>
        a.date.localeCompare(b.date)
      ),
  }))
}

export async function createAnalysisOverlay(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string,
  input: OverlayInput
) {
  await assertOwnedAnalysis(supabase, analysisId, userId)

  // 필터 검증: 클라이언트에서 보낸 필터와 분석의 필터가 일치하는지 확인
  if (input.region || input.period || input.search_type) {
    const { data: analysis, error: analysisError } = await supabase
      .from('keyword_analysis')
      .select('region, period, search_type')
      .eq('id', analysisId)
      .single()

    if (analysisError) throw analysisError
    if (!analysis) {
      throw new AnalysisOverlayServiceError(
        'NOT_FOUND',
        'Analysis를 찾을 수 없습니다.',
        404
      )
    }

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

  const { data: maxData } = await supabase
    .from('keyword_stock_overlays')
    .select('display_order')
    .eq('analysis_id', analysisId)
    .order('display_order', { ascending: false })
    .limit(1)

  const nextOrder =
    maxData && maxData.length > 0 ? maxData[0].display_order + 1 : 1

  const { data, error } = await supabase
    .from('keyword_stock_overlays')
    .insert({
      analysis_id: analysisId,
      ticker,
      company_name: input.company_name.trim(),
      display_order:
        typeof input.display_order === 'number'
          ? input.display_order
          : nextOrder,
    })
    .select('id')
    .single()

  if (error?.code === '23505') {
    throw new AnalysisOverlayServiceError(
      'DUPLICATE',
      '이미 추가된 종목입니다.',
      409
    )
  }

  if (error) throw error

  const overlayId = data.id

  try {
    let priceData = parsePriceData(input.price_data)
    if (priceData.length === 0) {
      const stockData = await fetchCachedStockData(ticker)
      priceData = stockData.priceData.map(point => ({
        date: point.date,
        price: point.close,
      }))
    }

    const records = toTimeseriesRecords(overlayId, priceData)
    if (records.length > 0) {
      const { error: timeseriesError } = await supabase
        .from('overlay_chart_timeseries')
        .insert(records)

      if (timeseriesError) {
        throw timeseriesError
      }
    }

    return { id: overlayId }
  } catch (error) {
    await supabase.from('keyword_stock_overlays').delete().eq('id', overlayId)
    throw error
  }
}

export async function updateAnalysisOverlayOrder(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string,
  overlays: unknown
) {
  await assertOwnedAnalysis(supabase, analysisId, userId)

  if (!Array.isArray(overlays) || overlays.length === 0) {
    throw new AnalysisOverlayServiceError(
      'INVALID_INPUT',
      '올바른 overlays 배열이 필요합니다.',
      400
    )
  }

  const parsedOverlays = overlays as OverlayOrderInput[]

  for (const item of parsedOverlays) {
    if (typeof item.id !== 'string' || typeof item.display_order !== 'number') {
      throw new AnalysisOverlayServiceError(
        'INVALID_INPUT',
        '각 overlay는 id와 display_order를 포함해야 합니다.',
        400
      )
    }
  }

  const results = await Promise.all(
    parsedOverlays.map(({ id, display_order }) =>
      supabase
        .from('keyword_stock_overlays')
        .update({ display_order })
        .eq('id', id)
        .eq('analysis_id', analysisId)
    )
  )

  for (const result of results) {
    if (result.error) throw result.error
  }

  return { success: true }
}

export async function deleteAnalysisOverlay(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string,
  overlayId: string
) {
  await assertOwnedAnalysis(supabase, analysisId, userId)

  const { error } = await supabase
    .from('keyword_stock_overlays')
    .delete()
    .eq('id', overlayId)
    .eq('analysis_id', analysisId)

  if (error) throw error

  return { success: true }
}
