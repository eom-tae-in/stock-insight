import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AdminAnomaly,
  AdminRecentAnalysis,
  AdminRecentOverlay,
  AdminSummary,
} from '@/server/admin-service'
import type { AdminReportRepository } from './admin-report-repository'

type TrendsPoint = {
  date?: unknown
  value?: unknown
}

type TimeseriesPoint = {
  date?: unknown
}

type KeywordJoin = {
  name?: string | null
  user_id?: string | null
}

type AnalysisJoin = {
  region?: string | null
  search_type?: string | null
  keywords?: KeywordJoin | KeywordJoin[] | null
}

type AnalysisRow = {
  id: string
  region: string | null
  period: string | null
  search_type: string | null
  trends_data: TrendsPoint[] | null
  updated_at: string | null
  created_at: string | null
  keywords?: KeywordJoin | KeywordJoin[] | null
}

type AdminRecentAnalysisRow = {
  id: string
  keyword_name: string | null
  region: string | null
  period: string | null
  search_type: string | null
  trends_data: TrendsPoint[] | null
  created_at: string | null
  updated_at: string | null
  recent_at: string | null
}

type OverlayRow = {
  id: string
  ticker: string | null
  company_name: string | null
  last_refreshed_at: string | null
  created_at: string | null
  overlay_chart_timeseries?: TimeseriesPoint[] | null
  keyword_analysis?: AnalysisJoin | AnalysisJoin[] | null
}

type AdminRecentOverlayRow = {
  id: string
  ticker: string | null
  company_name: string | null
  last_refreshed_at: string | null
  created_at: string | null
  recent_at: string | null
  region: string | null
  period: string | null
  search_type: string | null
  keyword_name: string | null
  overlay_chart_timeseries?: TimeseriesPoint[] | null
}

const MIN_TREND_POINTS = 52
const RECENT_DISPLAY_LIMIT = 20

type SupabaseTableQuery = ReturnType<SupabaseClient['from']>
type CountQuery = ReturnType<SupabaseTableQuery['select']>

export class SupabaseAdminReportRepository implements AdminReportRepository {
  constructor(private readonly client: SupabaseClient) {}

  async checkDatabase(): Promise<void> {
    await this.getCount('keywords')
  }

  async getUserCount(scope: AdminSummary['scope']): Promise<number | null> {
    if (scope !== 'global') return null

    const { data, error } = await this.client.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    })

    if (error) return null
    return data.total ?? null
  }

  getKeywordCount(): Promise<number> {
    return this.getCount('keywords')
  }

  getAnalysisCount(): Promise<number> {
    return this.getCount('keyword_analysis')
  }

  getOverlayCount(): Promise<number> {
    return this.getCount('keyword_stock_overlays')
  }

  getUnrefreshedOverlayCount(): Promise<number> {
    return this.getCount('keyword_stock_overlays', query =>
      query.is('last_refreshed_at', null)
    )
  }

  async findRecentAnalyses(): Promise<AdminRecentAnalysis[]> {
    const { data, error } = await this.client
      .from('admin_recent_keyword_analysis')
      .select(
        'id, keyword_name, region, period, search_type, trends_data, created_at, updated_at, recent_at'
      )
      .order('recent_at', { ascending: false })
      .limit(RECENT_DISPLAY_LIMIT)

    if (error) throw error

    return ((data ?? []) as AdminRecentAnalysisRow[]).map(row => {
      const dates = getTrendDates(row.trends_data)
      return {
        id: row.id,
        keyword: row.keyword_name ?? '-',
        region: row.region ?? '-',
        searchType: row.search_type ?? '-',
        period: row.period ?? '-',
        pointCount: dates.pointCount,
        firstDate: dates.firstDate,
        lastDate: dates.lastDate,
        refreshedAt: row.recent_at ?? row.updated_at ?? row.created_at,
      }
    })
  }

  async findRecentOverlays(): Promise<AdminRecentOverlay[]> {
    const { data, error } = await this.client
      .from('admin_recent_keyword_stock_overlays')
      .select(
        'id, ticker, company_name, last_refreshed_at, created_at, recent_at, region, period, search_type, keyword_name, overlay_chart_timeseries'
      )
      .order('recent_at', { ascending: false })
      .limit(RECENT_DISPLAY_LIMIT)

    if (error) throw error

    return ((data ?? []) as AdminRecentOverlayRow[]).map(row => {
      const dates = getTimeseriesDates(row.overlay_chart_timeseries)

      return {
        id: row.id,
        keyword: row.keyword_name ?? '-',
        conditionLabel: `${row.region ?? '-'} / ${row.search_type ?? '-'}`,
        ticker: row.ticker ?? '-',
        companyName: row.company_name ?? '-',
        pointCount: dates.pointCount,
        firstDate: dates.firstDate,
        lastDate: dates.lastDate,
        refreshedAt: row.recent_at ?? row.last_refreshed_at ?? row.created_at,
      }
    })
  }

  async findAnomalies(): Promise<AdminAnomaly[]> {
    const anomalies: AdminAnomaly[] = []

    const { data: analyses } = await this.client
      .from('keyword_analysis')
      .select(
        'id, region, search_type, trends_data, created_at, updated_at, keywords(name, user_id)'
      )
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(100)

    for (const row of ((analyses ?? []) as AnalysisRow[]).slice(0, 100)) {
      const dates = getTrendDates(row.trends_data)
      if (dates.pointCount === 0 || dates.pointCount < MIN_TREND_POINTS) {
        anomalies.push({
          id: row.id,
          type: 'analysis',
          label: getJoinedKeyword(row.keywords),
          reason:
            dates.pointCount === 0
              ? '트렌드 데이터 없음'
              : '트렌드 포인트 부족',
          detail: `${row.region ?? '-'} / ${row.search_type ?? '-'} · ${dates.pointCount}개`,
        })
      }
    }

    const { data: overlays } = await this.client
      .from('keyword_stock_overlays')
      .select(
        'id, ticker, company_name, last_refreshed_at, created_at, overlay_chart_timeseries(date), keyword_analysis(region, search_type, keywords(name, user_id))'
      )
      .order('created_at', { ascending: false })
      .limit(100)

    for (const row of ((overlays ?? []) as OverlayRow[]).slice(0, 100)) {
      const analysis = getJoinedAnalysis(row.keyword_analysis)
      const dates = getTimeseriesDates(row.overlay_chart_timeseries)

      if (!row.ticker?.trim()) {
        anomalies.push({
          id: row.id,
          type: 'overlay',
          label: `- · ${getJoinedKeyword(analysis?.keywords)}`,
          reason: '티커 값 없음',
          detail: `${analysis?.region ?? '-'} / ${analysis?.search_type ?? '-'} · ${dates.pointCount}개`,
        })
        continue
      }

      if (!analysis) {
        anomalies.push({
          id: row.id,
          type: 'overlay',
          label: `${row.ticker} · -`,
          reason: '분석 조건 연결 없음',
          detail: `연결된 keyword_analysis 없음 · ${dates.pointCount}개`,
        })
        continue
      }

      if (dates.pointCount === 0) {
        anomalies.push({
          id: row.id,
          type: 'overlay',
          label: `${row.ticker} · ${getJoinedKeyword(analysis.keywords)}`,
          reason: '주가 데이터 없음',
          detail: `${analysis.region ?? '-'} / ${analysis.search_type ?? '-'} · ${dates.pointCount}개`,
        })
      }
    }

    return anomalies.slice(0, 30)
  }

  private async getCount(
    table: string,
    build?: (query: CountQuery) => CountQuery
  ) {
    let query = this.client.from(table).select('*', {
      count: 'exact',
      head: true,
    })
    if (build) {
      query = build(query)
    }

    const { count, error } = await query
    if (error) throw error
    return count ?? 0
  }
}

function getJoinedKeyword(join?: KeywordJoin | KeywordJoin[] | null) {
  const keyword = Array.isArray(join) ? join[0] : join
  return keyword?.name ?? '-'
}

function getJoinedAnalysis(join?: AnalysisJoin | AnalysisJoin[] | null) {
  return Array.isArray(join) ? join[0] : join
}

function getTrendDates(trendsData: TrendsPoint[] | null | undefined) {
  const dates = (trendsData ?? [])
    .map(point => point.date)
    .filter((date): date is string => typeof date === 'string')
    .sort((a, b) => a.localeCompare(b))

  return {
    pointCount: dates.length,
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
  }
}

function getTimeseriesDates(points: TimeseriesPoint[] | null | undefined) {
  const dates = (points ?? [])
    .map(point => point.date)
    .filter((date): date is string => typeof date === 'string')
    .sort((a, b) => a.localeCompare(b))

  return {
    pointCount: dates.length,
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
  }
}
