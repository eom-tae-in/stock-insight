import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import YahooFinance from 'yahoo-finance2'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AdminReportRepository } from './repositories/admin-report-repository'
import { SupabaseAdminReportRepository } from './repositories/supabase-admin-report-repository'

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

const yf = new YahooFinance()
const ADMIN_KEY_PLACEHOLDERS = new Set([
  '추가해야함',
  '.....',
  'sb_secret_your_key_here',
  'your_supabase_service_role_key_here',
  'your_legacy_supabase_service_role_key_here',
])

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
  repository: AdminReportRepository
): Promise<AdminSystemStatus> {
  try {
    await repository.checkDatabase()
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

export function createAdminSummaryService(
  reportRepository: AdminReportRepository
) {
  return {
    async getAdminSummary(
      scope: AdminSummary['scope'],
      scopeMessage: string
    ): Promise<AdminSummary> {
      const [supabaseStatus, redisStatus, yahooStatus] = await Promise.all([
        getSupabaseStatus(reportRepository),
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
        reportRepository.getUserCount(scope),
        reportRepository.getKeywordCount(),
        reportRepository.getAnalysisCount(),
        reportRepository.getOverlayCount(),
        reportRepository.getUnrefreshedOverlayCount(),
        reportRepository.findRecentAnalyses(),
        reportRepository.findRecentOverlays(),
        reportRepository.findAnomalies(),
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
        statuses: [
          supabaseStatus,
          redisStatus,
          getPytrendsStatus(),
          yahooStatus,
        ],
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
    },
  }
}

function createSupabaseAdminReportRepository(supabase: SupabaseClient) {
  return new SupabaseAdminReportRepository(supabase)
}

export async function getAdminSummary(): Promise<AdminSummary> {
  const sessionClient = await createSupabaseServerClient()
  const {
    client: supabase,
    scope,
    scopeMessage,
  } = getAdminDataClient(sessionClient)
  const service = createAdminSummaryService(
    createSupabaseAdminReportRepository(supabase)
  )

  return service.getAdminSummary(scope, scopeMessage)
}
