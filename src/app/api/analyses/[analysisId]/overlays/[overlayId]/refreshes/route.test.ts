import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import {
  AnalysisOverlayServiceError,
  refreshAnalysisOverlay,
} from '@/server/analysis-overlays-service'
import {
  AnalysisServiceError,
  refreshKeywordAnalysis,
} from '@/server/keyword-analyses-service'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/analysis-overlays-service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/server/analysis-overlays-service')>()

  return {
    AnalysisOverlayServiceError: actual.AnalysisOverlayServiceError,
    refreshAnalysisOverlay: vi.fn(),
  }
})

vi.mock('@/server/keyword-analyses-service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/server/keyword-analyses-service')>()

  return {
    AnalysisServiceError: actual.AnalysisServiceError,
    refreshKeywordAnalysis: vi.fn(),
  }
})

function authenticate(userId = 'user-1') {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
}

function params(analysisId = 'analysis-1', overlayId = 'overlay-1') {
  return { params: Promise.resolve({ analysisId, overlayId }) }
}

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean
    data?: unknown
    error?: { code: string; message: string }
  }>
}

describe('analysis overlay refresh API integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authenticate()
  })

  it('returns unauthorized before refreshing an overlay', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const response = await POST(
      new NextRequest(
        'http://localhost/api/analyses/analysis-1/overlays/overlay-1/refreshes'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
    expect(refreshAnalysisOverlay).not.toHaveBeenCalled()
    expect(refreshKeywordAnalysis).not.toHaveBeenCalled()
  })

  it('refreshes the shared analysis before refreshing the overlay', async () => {
    const analysis = { id: 'analysis-1', trends_data: [] }
    const overlay = { id: 'overlay-1', ticker: 'AAPL' }
    vi.mocked(refreshKeywordAnalysis).mockResolvedValue(analysis as never)
    vi.mocked(refreshAnalysisOverlay).mockResolvedValue(overlay as never)

    const response = await POST(
      new NextRequest(
        'http://localhost/api/analyses/analysis-1/overlays/overlay-1/refreshes'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: overlay,
    })
    expect(refreshKeywordAnalysis).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'analysis-1'
    )
    expect(refreshAnalysisOverlay).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'analysis-1',
      'overlay-1'
    )
    expect(
      vi.mocked(refreshKeywordAnalysis).mock.invocationCallOrder[0]
    ).toBeLessThan(
      vi.mocked(refreshAnalysisOverlay).mock.invocationCallOrder[0]
    )
  })

  it('maps analysis refresh service errors before refreshing the overlay', async () => {
    vi.mocked(refreshKeywordAnalysis).mockRejectedValue(
      new AnalysisServiceError(
        'TRENDS_RATE_LIMITED',
        '트렌드 데이터를 갱신하지 못했습니다.',
        429
      )
    )

    const response = await POST(
      new NextRequest(
        'http://localhost/api/analyses/analysis-1/overlays/overlay-1/refreshes'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(429)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'TRENDS_RATE_LIMITED' },
    })
    expect(refreshAnalysisOverlay).not.toHaveBeenCalled()
  })

  it('maps overlay refresh service errors', async () => {
    vi.mocked(refreshAnalysisOverlay).mockRejectedValue(
      new AnalysisOverlayServiceError(
        'REFRESH_FAILED',
        '갱신된 오버레이를 다시 조회하지 못했습니다.',
        500
      )
    )

    const response = await POST(
      new NextRequest(
        'http://localhost/api/analyses/analysis-1/overlays/overlay-1/refreshes'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'REFRESH_FAILED' },
    })
  })

  it('maps unexpected refresh errors to fallback API errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(refreshAnalysisOverlay).mockRejectedValue(new Error('db down'))

    const response = await POST(
      new NextRequest(
        'http://localhost/api/analyses/analysis-1/overlays/overlay-1/refreshes'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'REFRESH_FAILED',
        message: 'Overlay 최신화에 실패했습니다.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith(
      'Overlay 최신화에 실패했습니다.',
      expect.any(Error)
    )

    consoleError.mockRestore()
  })
})
