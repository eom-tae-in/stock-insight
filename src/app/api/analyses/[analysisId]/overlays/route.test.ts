import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GET,
  PATCH,
  POST,
} from '@/app/api/analyses/[analysisId]/overlays/route'
import {
  AnalysisOverlayServiceError,
  createAnalysisOverlay,
  listAnalysisOverlays,
  updateAnalysisOverlayOrder,
} from '@/server/analysis-overlays-service'

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
    createAnalysisOverlay: vi.fn(),
    listAnalysisOverlays: vi.fn(),
    updateAnalysisOverlayOrder: vi.fn(),
  }
})

function authenticate(userId = 'user-1') {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
}

function request(body?: unknown) {
  return new NextRequest('http://localhost/api/analyses/analysis-1/overlays', {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : undefined,
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

describe('analysis overlays API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it.each([
    {
      action: 'listing overlays',
      call: () => GET(request(), params()),
      service: listAnalysisOverlays,
    },
    {
      action: 'creating an overlay',
      call: () => POST(request({ ticker: 'AAPL' }), params()),
      service: createAnalysisOverlay,
    },
    {
      action: 'updating overlay order',
      call: () => PATCH(request({ overlays: [] }), params()),
      service: updateAnalysisOverlayOrder,
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

  it('lists overlays for an authenticated analysis', async () => {
    const overlays = [
      {
        id: 'overlay-1',
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
      },
    ]
    vi.mocked(listAnalysisOverlays).mockResolvedValue(overlays as never)

    const response = await GET(request(), params())
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: overlays,
    })
    expect(listAnalysisOverlays).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'analysis-1'
    )
  })

  it('creates an overlay from request body', async () => {
    const overlay = {
      id: 'overlay-1',
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
    }
    const body = {
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      overlayData: [],
    }
    vi.mocked(createAnalysisOverlay).mockResolvedValue(overlay as never)

    const response = await POST(request(body), params())
    const responseBody = await readJson(response)

    expect(response.status).toBe(201)
    expect(responseBody).toMatchObject({
      success: true,
      data: overlay,
    })
    expect(createAnalysisOverlay).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'analysis-1',
      body
    )
  })

  it('updates overlay order from request body', async () => {
    const result = { updated: 2 }
    const body = {
      overlays: [
        { id: 'overlay-2', displayOrder: 0 },
        { id: 'overlay-1', displayOrder: 1 },
      ],
    }
    vi.mocked(updateAnalysisOverlayOrder).mockResolvedValue(result as never)

    const response = await PATCH(request(body), params())
    const responseBody = await readJson(response)

    expect(response.status).toBe(200)
    expect(responseBody).toMatchObject({
      success: true,
      data: result,
    })
    expect(updateAnalysisOverlayOrder).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'analysis-1',
      body.overlays
    )
  })

  it('maps overlay service errors to API error responses', async () => {
    vi.mocked(createAnalysisOverlay).mockRejectedValue(
      new AnalysisOverlayServiceError(
        'INVALID_INPUT',
        'ticker가 필요합니다.',
        400
      )
    )

    const response = await POST(
      request({ companyName: 'Apple Inc.' }),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'ticker가 필요합니다.',
      },
    })
  })

  it('maps unexpected overlay errors to fallback API errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(listAnalysisOverlays).mockRejectedValue(new Error('db down'))

    const response = await GET(request(), params())
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'DB_ERROR',
        message: 'Overlays를 조회하지 못했습니다.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith(
      'Overlays를 조회하지 못했습니다.',
      expect.any(Error)
    )

    consoleError.mockRestore()
  })
})
