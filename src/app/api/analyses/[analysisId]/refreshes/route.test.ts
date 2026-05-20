import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
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

function params(analysisId = 'analysis-1') {
  return { params: Promise.resolve({ analysisId }) }
}

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean
    data?: unknown
    error?: { code: string; message: string }
  }>
}

describe('analysis refresh API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it('returns unauthorized before refreshing an analysis', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const response = await POST(
      new NextRequest('http://localhost/api/analyses/analysis-1/refreshes'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
    expect(refreshKeywordAnalysis).not.toHaveBeenCalled()
  })

  it('refreshes an analysis for the authenticated user', async () => {
    const analysis = { id: 'analysis-1', trends_data: [] }
    vi.mocked(refreshKeywordAnalysis).mockResolvedValue(analysis as never)

    const response = await POST(
      new NextRequest('http://localhost/api/analyses/analysis-1/refreshes'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: analysis,
    })
    expect(refreshKeywordAnalysis).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'analysis-1'
    )
  })

  it('maps analysis refresh service errors', async () => {
    vi.mocked(refreshKeywordAnalysis).mockRejectedValue(
      new AnalysisServiceError(
        'TRENDS_RATE_LIMITED',
        '트렌드 데이터를 갱신하지 못했습니다.',
        429
      )
    )

    const response = await POST(
      new NextRequest('http://localhost/api/analyses/analysis-1/refreshes'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(429)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'TRENDS_RATE_LIMITED' },
    })
  })

  it('maps unexpected refresh errors to fallback API errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(refreshKeywordAnalysis).mockRejectedValue(new Error('db down'))

    const response = await POST(
      new NextRequest('http://localhost/api/analyses/analysis-1/refreshes'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'REFRESH_FAILED',
        message: 'Analysis 최신화에 실패했습니다.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith(
      'Analysis 최신화에 실패했습니다.',
      expect.any(Error)
    )

    consoleError.mockRestore()
  })
})
