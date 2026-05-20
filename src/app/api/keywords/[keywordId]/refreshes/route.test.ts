import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import {
  AnalysisServiceError,
  refreshDefaultKeywordAnalysis,
} from '@/server/keyword-analyses-service'

const supabaseMock = vi.hoisted(() => ({ auth: { getUser: vi.fn() } }))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/keyword-analyses-service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/server/keyword-analyses-service')>()
  return {
    AnalysisServiceError: actual.AnalysisServiceError,
    refreshDefaultKeywordAnalysis: vi.fn(),
  }
})

function authenticate(userId = 'user-1') {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
}

function params(keywordId = 'keyword-1') {
  return { params: Promise.resolve({ keywordId }) }
}

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean
    data?: unknown
    error?: { code: string; message: string }
  }>
}

describe('keyword refresh API route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it('returns unauthorized before refreshing keyword analysis', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const response = await POST(
      new NextRequest('http://localhost/api/keywords/keyword-1/refreshes'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
    expect(refreshDefaultKeywordAnalysis).not.toHaveBeenCalled()
  })

  it('refreshes default keyword analysis for the authenticated user', async () => {
    const result = { id: 'analysis-1', analysis: { id: 'analysis-1' } }
    vi.mocked(refreshDefaultKeywordAnalysis).mockResolvedValue(result as never)

    const response = await POST(
      new NextRequest('http://localhost/api/keywords/keyword-1/refreshes'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, data: result })
    expect(refreshDefaultKeywordAnalysis).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'keyword-1'
    )
  })

  it('maps analysis service errors to API errors', async () => {
    vi.mocked(refreshDefaultKeywordAnalysis).mockRejectedValue(
      new AnalysisServiceError('NOT_FOUND', '키워드를 찾을 수 없습니다.', 404)
    )

    const response = await POST(
      new NextRequest('http://localhost/api/keywords/keyword-1/refreshes'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(404)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND', message: '키워드를 찾을 수 없습니다.' },
    })
  })

  it('maps unexpected refresh failures to fallback API errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(refreshDefaultKeywordAnalysis).mockRejectedValue(
      new Error('db down')
    )

    const response = await POST(
      new NextRequest('http://localhost/api/keywords/keyword-1/refreshes'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'REFRESH_FAILED',
        message: '키워드 최신화에 실패했습니다.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith(
      '키워드 최신화에 실패했습니다.',
      expect.any(Error)
    )
    consoleError.mockRestore()
  })
})
