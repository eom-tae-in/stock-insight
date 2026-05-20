import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, GET, PATCH } from './route'
import {
  AnalysisServiceError,
  deleteOwnedAnalysis,
  getOwnedAnalysis,
  updateOwnedAnalysis,
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
    deleteOwnedAnalysis: vi.fn(),
    getOwnedAnalysis: vi.fn(),
    updateOwnedAnalysis: vi.fn(),
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

function request(body?: unknown) {
  return new NextRequest('http://localhost/api/analyses/analysis-1', {
    method: body ? 'PATCH' : 'GET',
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

describe('analysis detail API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it('returns the owned analysis', async () => {
    const analysis = { id: 'analysis-1', region: 'GLOBAL' }
    vi.mocked(getOwnedAnalysis).mockResolvedValue(analysis as never)

    const response = await GET(request(), params())
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: analysis,
    })
    expect(getOwnedAnalysis).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'analysis-1'
    )
  })

  it('returns 404 when the analysis cannot be found', async () => {
    vi.mocked(getOwnedAnalysis).mockResolvedValue(null)

    const response = await GET(request(), params())
    const body = await readJson(response)

    expect(response.status).toBe(404)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('updates the owned analysis from request JSON', async () => {
    vi.mocked(updateOwnedAnalysis).mockResolvedValue({ success: true } as never)

    const response = await PATCH(
      request({ ma13_data: 12, yoy_data: 20 }),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: { success: true },
    })
    expect(updateOwnedAnalysis).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'analysis-1',
      { ma13_data: 12, yoy_data: 20 }
    )
  })

  it('deletes the owned analysis', async () => {
    vi.mocked(deleteOwnedAnalysis).mockResolvedValue({ success: true } as never)

    const response = await DELETE(request(), params())
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: { success: true },
    })
    expect(deleteOwnedAnalysis).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'analysis-1'
    )
  })

  it('maps analysis service errors to API errors', async () => {
    vi.mocked(updateOwnedAnalysis).mockRejectedValue(
      new AnalysisServiceError('NOT_FOUND', 'Analysis를 찾을 수 없습니다.', 404)
    )

    const response = await PATCH(request({ ma13_data: 12 }), params())
    const body = await readJson(response)

    expect(response.status).toBe(404)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Analysis를 찾을 수 없습니다.',
      },
    })
  })

  it.each([
    {
      action: 'reading an analysis',
      call: () => GET(request(), params()),
      service: getOwnedAnalysis,
    },
    {
      action: 'updating an analysis',
      call: () => PATCH(request({ ma13_data: 12 }), params()),
      service: updateOwnedAnalysis,
    },
    {
      action: 'deleting an analysis',
      call: () => DELETE(request(), params()),
      service: deleteOwnedAnalysis,
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

  it('maps unexpected read failures to a 500 response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getOwnedAnalysis).mockRejectedValue(new Error('database failed'))

    const response = await GET(request(), params())
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'DB_ERROR',
        message: 'Analysis를 조회하지 못했습니다.',
      },
    })
  })

  it('maps unexpected delete failures to a 500 response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(deleteOwnedAnalysis).mockRejectedValue(
      new Error('database failed')
    )

    const response = await DELETE(request(), params())
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'DB_ERROR',
        message: 'Analysis 삭제에 실패했습니다.',
      },
    })
  })

  it('maps unexpected update failures to a 500 response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(updateOwnedAnalysis).mockRejectedValue(
      new Error('database failed')
    )

    const response = await PATCH(request({ ma13_data: 12 }), params())
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'DB_ERROR',
        message: 'Analysis 업데이트에 실패했습니다.',
      },
    })
  })
})
