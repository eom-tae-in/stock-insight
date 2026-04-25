import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  KeywordAnalysisSummary,
  KeywordAnalysisOverlay,
  KeywordRecord,
  KeywordStockOverlay,
  Period,
  Region,
  SearchType,
  TrendsDataPoint,
} from '@/types/database'
import { normalizeKeywordSpacing } from '@/lib/utils/keyword-normalization'

type KeywordRow = {
  id: string
  user_id: string
  name: string
  normalized_name: string | null
  created_at: string
  display_order: number | null
}

type KeywordAnalysisRefreshRow = {
  id: string
  keyword_id: string
  region: Region
  period: Period
  search_type: SearchType
  trends_data: TrendsDataPoint[] | null
  display_order: number | null
  updated_at: string | null
  created_at: string
}

async function selectKeywordAnalyses(
  supabase: SupabaseClient,
  keywordIds: string[]
): Promise<KeywordAnalysisRefreshRow[]> {
  const selectWithOrder =
    'id, keyword_id, region, period, search_type, trends_data, display_order, created_at, updated_at'
  const selectWithoutOrder =
    'id, keyword_id, region, period, search_type, trends_data, created_at, updated_at'

  const { data, error } = await supabase
    .from('keyword_analysis')
    .select(selectWithOrder)
    .in('keyword_id', keywordIds)

  if (!error) return (data ?? []) as KeywordAnalysisRefreshRow[]
  if (error.code !== '42703') throw error

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('keyword_analysis')
    .select(selectWithoutOrder)
    .in('keyword_id', keywordIds)

  if (fallbackError) throw fallbackError
  return (
    (fallbackData ?? []) as Omit<KeywordAnalysisRefreshRow, 'display_order'>[]
  ).map(analysis => ({
    ...analysis,
    display_order: null,
  }))
}

async function selectKeywordAnalysesByKeywordId(
  supabase: SupabaseClient,
  keywordId: string
): Promise<KeywordAnalysisRefreshRow[]> {
  const selectWithOrder =
    'id, keyword_id, region, period, search_type, trends_data, display_order, created_at, updated_at'
  const selectWithoutOrder =
    'id, keyword_id, region, period, search_type, trends_data, created_at, updated_at'

  const { data, error } = await supabase
    .from('keyword_analysis')
    .select(selectWithOrder)
    .eq('keyword_id', keywordId)
    .order('display_order', { ascending: true })
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (!error) return (data ?? []) as KeywordAnalysisRefreshRow[]
  if (error.code !== '42703') throw error

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('keyword_analysis')
    .select(selectWithoutOrder)
    .eq('keyword_id', keywordId)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (fallbackError) throw fallbackError
  return (
    (fallbackData ?? []) as Omit<KeywordAnalysisRefreshRow, 'display_order'>[]
  ).map(analysis => ({
    ...analysis,
    display_order: null,
  }))
}

type KeywordOverlayRow = {
  analysis_id: string
  id: string
  ticker: string
  company_name: string
  display_order: number
  created_at: string
  overlay_chart_timeseries?: Array<{
    date: string
    normalized_price: number | null
    raw_price: number | null
  }>
}

function toKeywordAnalysisOverlay(
  overlay: KeywordOverlayRow
): KeywordAnalysisOverlay {
  return {
    id: overlay.id,
    analysis_id: overlay.analysis_id,
    ticker: overlay.ticker,
    company_name: overlay.company_name,
    display_order: overlay.display_order,
    created_at: overlay.created_at,
    chart_data: (overlay.overlay_chart_timeseries ?? [])
      .map(point => ({
        date: point.date,
        normalizedPrice: point.normalized_price,
        rawPrice: point.raw_price,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}

function toKeywordRecord(
  row: KeywordRow,
  refreshedAt?: string | null,
  overlays: KeywordStockOverlay[] = [],
  analyses: KeywordAnalysisSummary[] = []
): KeywordRecord {
  const displayDate = refreshedAt ?? row.created_at

  return {
    id: row.id,
    user_id: row.user_id,
    keyword: row.name,
    normalized_keyword: row.normalized_name ?? row.name,
    region: 'GLOBAL',
    search_type: 'WEB',
    trends_data: [],
    searched_at: displayDate,
    created_at: row.created_at,
    updated_at: displayDate,
    display_order: row.display_order ?? 0,
    last_viewed_at: null,
    overlays,
    analyses,
  }
}

function getLatestAnalysisTimestamp(
  analyses: KeywordAnalysisRefreshRow[]
): string | null {
  if (analyses.length === 0) return null

  return analyses.reduce<string | null>((latest, analysis) => {
    const current = analysis.updated_at ?? analysis.created_at
    if (!latest) return current
    return new Date(current).getTime() > new Date(latest).getTime()
      ? current
      : latest
  }, null)
}

function dedupeOverlaysByTicker(
  overlays: KeywordStockOverlay[]
): KeywordStockOverlay[] {
  const uniqueByTicker = new Map<string, KeywordStockOverlay>()

  for (const overlay of overlays) {
    const normalizedTicker = overlay.ticker.trim().toUpperCase()
    if (!normalizedTicker || uniqueByTicker.has(normalizedTicker)) continue

    uniqueByTicker.set(normalizedTicker, {
      ...overlay,
      ticker: normalizedTicker,
    })
  }

  return Array.from(uniqueByTicker.values()).sort(
    (a, b) =>
      a.display_order - b.display_order || a.ticker.localeCompare(b.ticker)
  )
}

export async function getKeywords(
  supabase: SupabaseClient,
  userId: string
): Promise<KeywordRecord[]> {
  const { data, error } = await supabase
    .from('keywords')
    .select('id, user_id, name, normalized_name, created_at, display_order')
    .eq('user_id', userId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as KeywordRow[]
  const keywordIds = rows.map(row => row.id)

  if (keywordIds.length === 0) return []

  const analyses = await selectKeywordAnalyses(supabase, keywordIds)

  const analysesByKeywordId = new Map<string, KeywordAnalysisRefreshRow[]>()
  for (const analysis of analyses) {
    const current = analysesByKeywordId.get(analysis.keyword_id) ?? []
    current.push(analysis)
    analysesByKeywordId.set(analysis.keyword_id, current)
  }

  const analysisIds = Array.from(
    new Set(analyses.map(analysis => analysis.id).filter(Boolean))
  )

  const overlaysByKeywordId = new Map<string, KeywordStockOverlay[]>()
  const overlaysByAnalysisId = new Map<string, KeywordAnalysisOverlay[]>()

  if (analysisIds.length > 0) {
    const { data: overlays, error: overlaysError } = await supabase
      .from('keyword_stock_overlays')
      .select(
        'analysis_id, id, ticker, company_name, display_order, created_at, overlay_chart_timeseries(date, normalized_price, raw_price)'
      )
      .in('analysis_id', analysisIds)
      .order('display_order', { ascending: true })

    if (overlaysError) throw overlaysError

    const keywordIdByAnalysisId = new Map(
      analyses.map(analysis => [analysis.id, analysis.keyword_id])
    )

    for (const overlay of (overlays ?? []) as KeywordOverlayRow[]) {
      const analysisOverlay = toKeywordAnalysisOverlay(overlay)
      const analysisOverlays =
        overlaysByAnalysisId.get(overlay.analysis_id) ?? []
      analysisOverlays.push(analysisOverlay)
      overlaysByAnalysisId.set(overlay.analysis_id, analysisOverlays)

      const keywordId = keywordIdByAnalysisId.get(overlay.analysis_id)
      if (!keywordId) continue

      const current = overlaysByKeywordId.get(keywordId) ?? []
      current.push({
        id: overlay.id,
        analysis_id: overlay.analysis_id,
        ticker: overlay.ticker,
        company_name: overlay.company_name,
        display_order: overlay.display_order,
        created_at: overlay.created_at,
        chart_data: analysisOverlay.chart_data,
      })
      overlaysByKeywordId.set(keywordId, current)
    }
  }

  return rows.map(row =>
    toKeywordRecord(
      row,
      getLatestAnalysisTimestamp(analysesByKeywordId.get(row.id) ?? []),
      dedupeOverlaysByTicker(overlaysByKeywordId.get(row.id) ?? []),
      (analysesByKeywordId.get(row.id) ?? [])
        .filter(analysis => analysis.period === '5Y')
        .sort(
          (a, b) =>
            (a.display_order ?? 0) - (b.display_order ?? 0) ||
            new Date(b.updated_at ?? b.created_at).getTime() -
              new Date(a.updated_at ?? a.created_at).getTime()
        )
        .map(analysis => ({
          id: analysis.id,
          keyword_id: analysis.keyword_id,
          region: analysis.region,
          period: analysis.period,
          search_type: analysis.search_type,
          trends_data: analysis.trends_data ?? [],
          overlays: overlaysByAnalysisId.get(analysis.id) ?? [],
          display_order: analysis.display_order ?? 0,
          created_at: analysis.created_at,
          updated_at: analysis.updated_at ?? undefined,
        }))
    )
  )
}

export async function getKeyword(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string
): Promise<KeywordRecord | null> {
  const { data, error } = await supabase
    .from('keywords')
    .select('id, user_id, name, normalized_name, created_at, display_order')
    .eq('id', keywordId)
    .eq('user_id', userId)
    .single()

  if (error?.code === 'PGRST116') return null
  if (error) throw error

  const analyses = await selectKeywordAnalysesByKeywordId(supabase, keywordId)
  const analysisIds = analyses.map(item => item.id)
  const overlays: KeywordStockOverlay[] = []

  if (analysisIds.length > 0) {
    const { data: overlayRows, error: overlayError } = await supabase
      .from('keyword_stock_overlays')
      .select(
        'analysis_id, id, ticker, company_name, display_order, created_at, overlay_chart_timeseries(date, normalized_price, raw_price)'
      )
      .in('analysis_id', analysisIds)
      .order('display_order', { ascending: true })

    if (overlayError) throw overlayError

    overlays.push(
      ...((overlayRows ?? []) as KeywordOverlayRow[]).map(
        toKeywordAnalysisOverlay
      )
    )
  }

  const overlaysByAnalysisId = new Map<string, KeywordAnalysisOverlay[]>()
  for (const overlay of overlays) {
    if (!overlay.analysis_id) continue

    const current = overlaysByAnalysisId.get(overlay.analysis_id) ?? []
    current.push(overlay as KeywordAnalysisOverlay)
    overlaysByAnalysisId.set(overlay.analysis_id, current)
  }

  return toKeywordRecord(
    data as KeywordRow,
    getLatestAnalysisTimestamp(analyses),
    dedupeOverlaysByTicker(overlays),
    analyses
      .filter(analysis => analysis.period === '5Y')
      .sort(
        (a, b) =>
          (a.display_order ?? 0) - (b.display_order ?? 0) ||
          new Date(b.updated_at ?? b.created_at).getTime() -
            new Date(a.updated_at ?? a.created_at).getTime()
      )
      .map(analysis => ({
        id: analysis.id,
        keyword_id: analysis.keyword_id,
        region: analysis.region,
        period: analysis.period,
        search_type: analysis.search_type,
        trends_data: analysis.trends_data ?? [],
        overlays: overlaysByAnalysisId.get(analysis.id) ?? [],
        display_order: analysis.display_order ?? 0,
        created_at: analysis.created_at,
        updated_at: analysis.updated_at ?? undefined,
      }))
  )
}

export async function upsertKeyword(
  supabase: SupabaseClient,
  userId: string,
  keyword: string
): Promise<KeywordRecord> {
  const normalizedKeyword = normalizeKeywordSpacing(keyword)

  if (!normalizedKeyword) {
    throw new Error('KEYWORD_REQUIRED')
  }

  const { data: existing, error: existingError } = await supabase
    .from('keywords')
    .select('id, user_id, name, normalized_name, created_at, display_order')
    .eq('user_id', userId)
    .eq('normalized_name', normalizedKeyword)
    .single()

  if (existingError && existingError.code !== 'PGRST116') throw existingError
  if (existing) return toKeywordRecord(existing as KeywordRow)

  const { data: orderRows, error: orderError } = await supabase
    .from('keywords')
    .select('display_order')
    .eq('user_id', userId)
    .order('display_order', { ascending: false })
    .limit(1)

  if (orderError) throw orderError

  const nextDisplayOrder =
    orderRows && orderRows.length > 0
      ? Number(orderRows[0].display_order ?? 0) + 1
      : 1

  const { data, error } = await supabase
    .from('keywords')
    .insert({
      user_id: userId,
      name: normalizedKeyword,
      normalized_name: normalizedKeyword,
      display_order: nextDisplayOrder,
    })
    .select('id, user_id, name, normalized_name, created_at, display_order')
    .single()

  if (error) throw error

  return toKeywordRecord(data as KeywordRow)
}

export async function updateKeyword(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string,
  keyword: string
): Promise<KeywordRecord | null> {
  const normalizedKeyword = normalizeKeywordSpacing(keyword)

  if (!normalizedKeyword) {
    throw new Error('KEYWORD_REQUIRED')
  }

  const { data, error } = await supabase
    .from('keywords')
    .update({
      name: normalizedKeyword,
      normalized_name: normalizedKeyword,
    })
    .eq('id', keywordId)
    .eq('user_id', userId)
    .select('id, user_id, name, normalized_name, created_at, display_order')
    .single()

  if (error?.code === 'PGRST116') return null
  if (error) throw error

  return toKeywordRecord(data as KeywordRow)
}

export async function reorderKeywords(
  supabase: SupabaseClient,
  userId: string,
  orderedIds: string[]
): Promise<void> {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new Error('INVALID_ORDER')
  }

  const uniqueIds = Array.from(new Set(orderedIds))
  if (uniqueIds.length !== orderedIds.length) {
    throw new Error('DUPLICATE_KEYWORD_ID')
  }

  const { data: ownedKeywords, error: ownedError } = await supabase
    .from('keywords')
    .select('id')
    .eq('user_id', userId)
    .in('id', orderedIds)

  if (ownedError) throw ownedError
  if ((ownedKeywords ?? []).length !== orderedIds.length) {
    throw new Error('KEYWORD_OWNERSHIP_MISMATCH')
  }

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('keywords')
      .update({ display_order: index + 1 })
      .eq('id', id)
      .eq('user_id', userId)
  )

  const results = await Promise.all(updates)
  const failed = results.find(result => result.error)
  if (failed?.error) throw failed.error
}

export async function deleteKeyword(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('keywords')
    .delete()
    .eq('id', keywordId)
    .eq('user_id', userId)
    .select('id')

  if (error) throw error

  return (data ?? []).length > 0
}
