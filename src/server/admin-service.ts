import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import YahooFinance from 'yahoo-finance2'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type AdminStatusLevel = 'ok' | 'warning' | 'error' | 'disabled'

export type AdminSystemStatus = {
  id: string
  label: string
  status: AdminStatusLevel
  message: string
}

export type AdminMetric = {
  id: string
  label: string
  value: number | null
  helper?: string
}

export type AdminRecentAnalysis = {
  id: string
  keyword: string
  region: string
  searchType: string
  period: string
  pointCount: number
  firstDate: string | null
  lastDate: string | null
  refreshedAt: string | null
}

export type AdminRecentOverlay = {
  id: string
  keyword: string
  conditionLabel: string
  ticker: string
  companyName: string
  pointCount: number
  firstDate: string | null
  lastDate: string | null
  refreshedAt: string | null
}

export type AdminAnomaly = {
  id: string
  type: 'analysis' | 'overlay'
  label: string
  reason: string
  detail: string
}

export type AdminSummary = {
  generatedAt: string
  scope: 'global' | 'session'
  scopeMessage: string
  environment: {
    nodeEnv: string
    vercelEnv: string | null
    vercelUrl: string | null
  }
  statuses: AdminSystemStatus[]
  metrics: AdminMetric[]
  recentAnalyses: AdminRecentAnalysis[]
  recentOverlays: AdminRecentOverlay[]
  anomalies: AdminAnomaly[]
}

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

const yf = new YahooFinance()
const ADMIN_KEY_PLACEHOLDERS = new Set([
  '추가해야함',
  '.....',
  'sb_secret_your_key_here',
  'your_supabase_service_role_key_here',
  'your_legacy_supabase_service_role_key_here',
])

type SupabaseTableQuery = ReturnType<SupabaseClient['from']>
type CountQuery = ReturnType<SupabaseTableQuery['select']>

function readAdminKey(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed || ADMIN_KEY_PLACEHOLDERS.has(trimmed)) return undefined
  return trimmed
}

function getAdminDataClient(fallbackClient: SupabaseClient) {
  const adminKey = readAdminKey(process.env.SUPABASE_SECRET_KEY)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!adminKey || !url) {
    return {
      client: fallbackClient,
      scope: 'session' as const,
      scopeMessage:
        'SUPABASE_SECRET_KEY가 없어 현재 관리자 세션에서 조회 가능한 데이터만 표시합니다.',
    }
  }

  return {
    client: createClient(url, adminKey, {
      auth: { persistSession: false },
    }),
    scope: 'global' as const,
    scopeMessage: '서비스 역할 키로 전체 운영 데이터를 표시합니다.',
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

async function getCount(
  supabase: SupabaseClient,
  table: string,
  build?: (query: CountQuery) => CountQuery
) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true })
  if (build) {
    query = build(query)
  }

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

async function getRedisStatus(): Promise<AdminSystemStatus> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    return {
      id: 'redis',
      label: 'Redis',
      status: 'disabled',
      message: 'Upstash 환경변수가 없어 캐시 상태를 확인하지 않습니다.',
    }
  }

  try {
    const response = await fetch(
      `${url.replace(/\/$/, '')}/get/${encodeURIComponent('admin:health')}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }
    )

    return {
      id: 'redis',
      label: 'Redis',
      status: response.ok ? 'ok' : 'warning',
      message: response.ok
        ? 'REST API 연결이 가능합니다.'
        : `REST API가 ${response.status}를 반환했습니다.`,
    }
  } catch (error) {
    return {
      id: 'redis',
      label: 'Redis',
      status: 'error',
      message: error instanceof Error ? error.message : 'Redis 연결 실패',
    }
  }
}

function getPytrendsStatus(): AdminSystemStatus {
  if (!process.env.PYTRENDS_INTERNAL_SECRET) {
    return {
      id: 'pytrends',
      label: 'pytrends',
      status: 'disabled',
      message: 'PYTRENDS_INTERNAL_SECRET가 설정되지 않았습니다.',
    }
  }

  if (!process.env.VERCEL_URL) {
    return {
      id: 'pytrends',
      label: 'pytrends',
      status: 'warning',
      message:
        '로컬 환경에서는 /api/pytrends Python runtime이 404일 수 있습니다. 배포 환경에서 실제 동작을 확인하세요.',
    }
  }

  return {
    id: 'pytrends',
    label: 'pytrends',
    status: 'ok',
    message: '배포 URL과 내부 인증 secret이 설정되어 있습니다.',
  }
}

async function getYahooStatus(): Promise<AdminSystemStatus> {
  try {
    const quote = await Promise.race([
      yf.quote('AAPL'),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Yahoo Finance timeout')), 3500)
      ),
    ])

    return {
      id: 'yahoo',
      label: 'Yahoo Finance',
      status: quote ? 'ok' : 'warning',
      message: quote
        ? 'AAPL quote 조회가 가능합니다.'
        : '응답이 비어 있습니다.',
    }
  } catch (error) {
    return {
      id: 'yahoo',
      label: 'Yahoo Finance',
      status: 'warning',
      message:
        error instanceof Error ? error.message : 'Yahoo Finance 확인 실패',
    }
  }
}

async function getSupabaseStatus(
  supabase: SupabaseClient
): Promise<AdminSystemStatus> {
  try {
    await getCount(supabase, 'keywords')
    return {
      id: 'supabase',
      label: 'Supabase',
      status: 'ok',
      message: '데이터베이스 조회가 가능합니다.',
    }
  } catch (error) {
    return {
      id: 'supabase',
      label: 'Supabase',
      status: 'error',
      message: error instanceof Error ? error.message : 'Supabase 조회 실패',
    }
  }
}

async function getUserCount(
  supabase: SupabaseClient,
  scope: AdminSummary['scope']
) {
  if (scope !== 'global') return null

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  })

  if (error) return null
  return data.total ?? null
}

async function getRecentAnalyses(supabase: SupabaseClient) {
  const { data, error } = await supabase
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

async function getRecentOverlays(supabase: SupabaseClient) {
  const { data, error } = await supabase
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

async function getAnomalies(supabase: SupabaseClient): Promise<AdminAnomaly[]> {
  const anomalies: AdminAnomaly[] = []

  const { data: analyses } = await supabase
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
          dates.pointCount === 0 ? '트렌드 데이터 없음' : '트렌드 포인트 부족',
        detail: `${row.region ?? '-'} / ${row.search_type ?? '-'} · ${dates.pointCount}개`,
      })
    }
  }

  const { data: overlays } = await supabase
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

export async function getAdminSummary(): Promise<AdminSummary> {
  const sessionClient = await createSupabaseServerClient()
  const {
    client: supabase,
    scope,
    scopeMessage,
  } = getAdminDataClient(sessionClient)

  const [supabaseStatus, redisStatus, yahooStatus] = await Promise.all([
    getSupabaseStatus(supabase),
    getRedisStatus(),
    getYahooStatus(),
  ])

  const [
    userCount,
    keywordCount,
    analysisCount,
    overlayCount,
    unrefreshedOverlayCount,
    recentAnalyses,
    recentOverlays,
    anomalies,
  ] = await Promise.all([
    getUserCount(supabase, scope),
    getCount(supabase, 'keywords'),
    getCount(supabase, 'keyword_analysis'),
    getCount(supabase, 'keyword_stock_overlays'),
    getCount(supabase, 'keyword_stock_overlays', query =>
      query.is('last_refreshed_at', null)
    ),
    getRecentAnalyses(supabase),
    getRecentOverlays(supabase),
    getAnomalies(supabase),
  ])

  return {
    generatedAt: new Date().toISOString(),
    scope,
    scopeMessage,
    environment: {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      vercelEnv: process.env.VERCEL_ENV ?? null,
      vercelUrl: process.env.VERCEL_URL ?? null,
    },
    statuses: [supabaseStatus, redisStatus, getPytrendsStatus(), yahooStatus],
    metrics: [
      { id: 'users', label: '사용자', value: userCount },
      { id: 'keywords', label: '키워드', value: keywordCount },
      { id: 'analyses', label: '분석 조건', value: analysisCount },
      { id: 'overlays', label: '티커 연동', value: overlayCount },
      {
        id: 'unrefreshedOverlays',
        label: '갱신 이력 없음',
        value: unrefreshedOverlayCount,
        helper: '수동 갱신 기록 없음',
      },
    ],
    recentAnalyses,
    recentOverlays,
    anomalies,
  }
}
