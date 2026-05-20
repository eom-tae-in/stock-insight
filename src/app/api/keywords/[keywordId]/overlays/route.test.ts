import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, PATCH, POST } from './route'
import { listAnalysisOverlays } from '@/server/analysis-overlays-service'
import {
  ApiServiceError,
  createKeywordOverlay,
  listKeywordOverlays,
  updateKeywordOverlayOrder,
} from '@/server/keyword-overlays-service'

const supabaseMock = vi.hoisted(() => ({ auth: { getUser: vi.fn() } }))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/analysis-overlays-service', () => ({
  listAnalysisOverlays: vi.fn(),
}))

vi.mock('@/server/keyword-overlays-service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/server/keyword-overlays-service')>()
  return {
    ApiServiceError: actual.ApiServiceError,
    createKeywordOverlay: vi.fn(),
    listKeywordOverlays: vi.fn(),
    updateKeywordOverlayOrder: vi.fn(),
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

function request(url: string, body?: unknown) {
  return new NextRequest(url, {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : undefined,
  })
}

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean
    data?: unknown
    error?: { code: string; message: string }
  }>
}

describe('keyword overlays API route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it.each([
    {
      action: 'listing keyword overlays',
      call: () =>
        GET(
          request('http://localhost/api/keywords/keyword-1/overlays'),
          params()
        ),
      service: listKeywordOverlays,
    },
    {
      action: 'creating keyword overlay',
      call: () =>
        POST(
          request('http://localhost/api/keywords/keyword-1/overlays', {
            ticker: 'AAPL',
          }),
          params()
        ),
      service: createKeywordOverlay,
    },
    {
      action: 'updating keyword overlay order',
      call: () =>
        PATCH(
          request('http://localhost/api/keywords/keyword-1/overlays', {
            orderedIds: ['overlay-1'],
          }),
          params()
        ),
      service: updateKeywordOverlayOrder,
    },
  ])('returns unauthorized before $action', async ({ call, service }) => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const response = await call()
    const body = await readJson(response)

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
    expect(service).not.toHaveBeenCalled()
  })

  it('lists keyword overlays by keyword id', async () => {
    const overlays = [{ id: 'overlay-1', ticker: 'AAPL' }]
    vi.mocked(listKeywordOverlays).mockResolvedValue(overlays as never)

    const response = await GET(
      request('http://localhost/api/keywords/keyword-1/overlays'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, data: overlays })
    expect(listKeywordOverlays).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'keyword-1'
    )
  })

  it('lists overlays by analysis id when query parameter is supplied', async () => {
    const overlays = [{ id: 'overlay-1', ticker: 'AAPL' }]
    vi.mocked(listAnalysisOverlays).mockResolvedValue(overlays as never)

    const response = await GET(
      request(
        'http://localhost/api/keywords/keyword-1/overlays?analysisId=analysis-1'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, data: overlays })
    expect(listAnalysisOverlays).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'analysis-1'
    )
    expect(listKeywordOverlays).not.toHaveBeenCalled()
  })

  it('creates a keyword overlay from request body', async () => {
    const overlay = { id: 'overlay-1', ticker: 'AAPL' }
    const body = { ticker: 'AAPL', companyName: 'Apple Inc.' }
    vi.mocked(createKeywordOverlay).mockResolvedValue(overlay as never)

    const response = await POST(
      request('http://localhost/api/keywords/keyword-1/overlays', body),
      params()
    )
    const responseBody = await readJson(response)

    expect(response.status).toBe(201)
    expect(responseBody).toMatchObject({ success: true, data: overlay })
    expect(createKeywordOverlay).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'keyword-1',
      body
    )
  })

  it('updates keyword overlay order', async () => {
    const overlays = [{ id: 'overlay-1', displayOrder: 0 }]
    vi.mocked(updateKeywordOverlayOrder).mockResolvedValue(overlays as never)

    const response = await PATCH(
      request('http://localhost/api/keywords/keyword-1/overlays', {
        orderedIds: ['overlay-1'],
      }),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, data: overlays })
    expect(updateKeywordOverlayOrder).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'keyword-1',
      ['overlay-1']
    )
  })

  it('maps keyword overlay service errors to API errors', async () => {
    vi.mocked(createKeywordOverlay).mockRejectedValue(
      new ApiServiceError('INVALID_BODY', 'ticker는 필수입니다.', 400)
    )

    const response = await POST(
      request('http://localhost/api/keywords/keyword-1/overlays', {}),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'INVALID_BODY', message: 'ticker는 필수입니다.' },
    })
  })

  it('maps unexpected overlay failures to fallback API errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(listKeywordOverlays).mockRejectedValue(new Error('db down'))

    const response = await GET(
      request('http://localhost/api/keywords/keyword-1/overlays'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'DB_ERROR',
        message: '오버레이 목록을 불러오지 못했습니다.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith(
      '오버레이 목록을 불러오지 못했습니다.',
      expect.any(Error)
    )
    consoleError.mockRestore()
  })
})
