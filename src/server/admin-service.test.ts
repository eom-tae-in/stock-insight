import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAdminSummaryService } from './admin-service'
import type { AdminReportRepository } from './repositories/admin-report-repository'

const yahooQuoteMock = vi.hoisted(() => vi.fn())

vi.mock('yahoo-finance2', () => ({
  default: vi.fn(function YahooFinanceMock() {
    return {
      quote: yahooQuoteMock,
    }
  }),
}))

const repository = {
  checkDatabase: vi.fn(),
  getUserCount: vi.fn(),
  getKeywordCount: vi.fn(),
  getAnalysisCount: vi.fn(),
  getOverlayCount: vi.fn(),
  getUnrefreshedOverlayCount: vi.fn(),
  findRecentAnalyses: vi.fn(),
  findRecentOverlays: vi.fn(),
  findAnomalies: vi.fn(),
} satisfies AdminReportRepository

describe('admin-service', () => {
  const originalEnv = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    PYTRENDS_INTERNAL_SECRET: process.env.PYTRENDS_INTERNAL_SECRET,
    VERCEL_URL: process.env.VERCEL_URL,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.PYTRENDS_INTERNAL_SECRET
    delete process.env.VERCEL_URL

    repository.checkDatabase.mockResolvedValue(undefined)
    repository.getUserCount.mockResolvedValue(2)
    repository.getKeywordCount.mockResolvedValue(3)
    repository.getAnalysisCount.mockResolvedValue(4)
    repository.getOverlayCount.mockResolvedValue(5)
    repository.getUnrefreshedOverlayCount.mockResolvedValue(1)
    repository.findRecentAnalyses.mockResolvedValue([])
    repository.findRecentOverlays.mockResolvedValue([])
    repository.findAnomalies.mockResolvedValue([])
    yahooQuoteMock.mockResolvedValue({ symbol: 'AAPL' })
  })

  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = originalEnv.UPSTASH_REDIS_REST_URL
    process.env.UPSTASH_REDIS_REST_TOKEN = originalEnv.UPSTASH_REDIS_REST_TOKEN
    process.env.PYTRENDS_INTERNAL_SECRET = originalEnv.PYTRENDS_INTERNAL_SECRET
    process.env.VERCEL_URL = originalEnv.VERCEL_URL
  })

  it('builds admin summary from repository metrics and service statuses', async () => {
    const service = createAdminSummaryService(repository)

    const summary = await service.getAdminSummary('session', 'session scoped')

    expect(summary).toMatchObject({
      scope: 'session',
      scopeMessage: 'session scoped',
      statuses: [
        { id: 'supabase', status: 'ok' },
        { id: 'redis', status: 'disabled' },
        { id: 'pytrends', status: 'disabled' },
        { id: 'yahoo', status: 'ok' },
      ],
      metrics: [
        { id: 'users', value: 2 },
        { id: 'keywords', value: 3 },
        { id: 'analyses', value: 4 },
        { id: 'overlays', value: 5 },
        { id: 'unrefreshedOverlays', value: 1 },
      ],
    })
    expect(repository.getUserCount).toHaveBeenCalledWith('session')
  })

  it('marks Supabase status as error when repository health check fails', async () => {
    const service = createAdminSummaryService(repository)
    repository.checkDatabase.mockRejectedValue(new Error('db down'))

    const summary = await service.getAdminSummary('global', 'global scoped')

    expect(summary.statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'supabase',
          status: 'error',
          message: 'db down',
        }),
      ])
    )
  })

  it('marks Yahoo status as warning when quote check fails', async () => {
    const service = createAdminSummaryService(repository)
    yahooQuoteMock.mockRejectedValue(new Error('Yahoo timeout'))

    const summary = await service.getAdminSummary('session', 'session scoped')

    expect(summary.statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'yahoo',
          status: 'warning',
          message: 'Yahoo timeout',
        }),
      ])
    )
  })
})
