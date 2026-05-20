import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  KeywordAnalysisOverlay,
  Period,
  Region,
  SearchType,
} from '@/types/database'
import type {
  AnalysisFilterSnapshot,
  OverlayOrderRecord,
  OverlayRepository,
  OverlayTicker,
  OverlayTimeseriesRecord,
} from './overlay-repository'

type OverlayRow = {
  id: string
  analysis_id: string
  ticker: string
  company_name: string
  display_order: number
  last_refreshed_at: string | null
  created_at: string
  overlay_chart_timeseries?: Array<{
    date: string
    normalized_price: number | null
    raw_price: number | null
  }>
}

export class SupabaseOverlayRepository implements OverlayRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findOwnedAnalysisFilters(
    userId: string,
    analysisId: string
  ): Promise<AnalysisFilterSnapshot | null> {
    const { data: analysis, error: analysisError } = await this.client
      .from('keyword_analysis')
      .select('keyword_id, region, period, search_type')
      .eq('id', analysisId)
      .single()

    if (analysisError && analysisError.code !== 'PGRST116') throw analysisError
    if (!analysis) return null

    const { data: keyword, error: keywordError } = await this.client
      .from('keywords')
      .select('id')
      .eq('id', analysis.keyword_id)
      .eq('user_id', userId)
      .single()

    if (keywordError && keywordError.code !== 'PGRST116') throw keywordError
    if (!keyword) return null

    return {
      region: analysis.region as Region,
      period: analysis.period as Period,
      search_type: analysis.search_type as SearchType,
    }
  }

  async findManyByAnalysisId(
    userId: string,
    analysisId: string
  ): Promise<KeywordAnalysisOverlay[]> {
    const analysis = await this.findOwnedAnalysisFilters(userId, analysisId)
    if (!analysis) return []

    const { data, error } = await this.client
      .from('keyword_stock_overlays')
      .select('*, overlay_chart_timeseries(date, normalized_price, raw_price)')
      .eq('analysis_id', analysisId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return ((data ?? []) as OverlayRow[]).map(toOverlay)
  }

  async create(input: {
    analysisId: string
    ticker: string
    companyName: string
    displayOrder?: number
  }): Promise<string> {
    const { data: maxData } = await this.client
      .from('keyword_stock_overlays')
      .select('display_order')
      .eq('analysis_id', input.analysisId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder =
      maxData && maxData.length > 0 ? maxData[0].display_order + 1 : 1

    const { data, error } = await this.client
      .from('keyword_stock_overlays')
      .insert({
        analysis_id: input.analysisId,
        ticker: input.ticker,
        company_name: input.companyName,
        display_order: input.displayOrder ?? nextOrder,
      })
      .select('id')
      .single()

    if (error?.code === '23505') throw new Error('DUPLICATE_OVERLAY')
    if (error) throw error

    return data.id
  }

  async insertTimeseries(records: OverlayTimeseriesRecord[]): Promise<void> {
    if (records.length === 0) return

    const { error } = await this.client
      .from('overlay_chart_timeseries')
      .insert(records)

    if (error) throw error
  }

  async updateOrder(
    analysisId: string,
    overlays: OverlayOrderRecord[]
  ): Promise<void> {
    const results = await Promise.all(
      overlays.map(({ id, display_order }) =>
        this.client
          .from('keyword_stock_overlays')
          .update({ display_order })
          .eq('id', id)
          .eq('analysis_id', analysisId)
      )
    )

    for (const result of results) {
      if (result.error) throw result.error
    }
  }

  async deleteById(analysisId: string, overlayId: string): Promise<boolean> {
    const { error } = await this.client
      .from('keyword_stock_overlays')
      .delete()
      .eq('id', overlayId)
      .eq('analysis_id', analysisId)

    if (error) throw error
    return true
  }

  async findTickerById(
    analysisId: string,
    overlayId: string
  ): Promise<OverlayTicker | null> {
    const { data, error } = await this.client
      .from('keyword_stock_overlays')
      .select('id, ticker')
      .eq('id', overlayId)
      .eq('analysis_id', analysisId)
      .single()

    if (error?.code === 'PGRST116') return null
    if (error) throw error

    return data as OverlayTicker
  }

  async refreshTimeseries(input: {
    analysisId: string
    overlayId: string
    records: OverlayTimeseriesRecord[]
    pruneBeforeDate?: string
  }): Promise<void> {
    if (input.pruneBeforeDate) {
      const { error: pruneError } = await this.client
        .from('overlay_chart_timeseries')
        .delete()
        .eq('overlay_id', input.overlayId)
        .lt('date', input.pruneBeforeDate)

      if (pruneError) throw pruneError
    }

    if (input.records.length > 0) {
      const { error: timeseriesError } = await this.client
        .from('overlay_chart_timeseries')
        .upsert(input.records, { onConflict: 'overlay_id,date' })

      if (timeseriesError) throw timeseriesError
    }

    const { error: overlayUpdateError } = await this.client
      .from('keyword_stock_overlays')
      .update({ last_refreshed_at: new Date().toISOString() })
      .eq('id', input.overlayId)
      .eq('analysis_id', input.analysisId)

    if (overlayUpdateError) throw overlayUpdateError
  }
}

function toOverlay(row: OverlayRow): KeywordAnalysisOverlay {
  return {
    id: row.id,
    analysis_id: row.analysis_id,
    ticker: row.ticker,
    company_name: row.company_name,
    display_order: row.display_order,
    last_refreshed_at: row.last_refreshed_at,
    lastRefreshedAt: row.last_refreshed_at,
    created_at: row.created_at,
    chart_data: (row.overlay_chart_timeseries ?? [])
      .map(point => ({
        date: point.date,
        normalizedPrice: point.normalized_price,
        rawPrice: point.raw_price,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}
