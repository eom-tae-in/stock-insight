import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE } from './route'
import {
  AnalysisOverlayServiceError,
  deleteAnalysisOverlay,
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
    deleteAnalysisOverlay: vi.fn(),
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

describe('analysis overlay detail API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it('returns unauthorized before deleting an overlay', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const response = await DELETE(
      new NextRequest(
        'http://localhost/api/analyses/analysis-1/overlays/overlay-1'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
    expect(deleteAnalysisOverlay).not.toHaveBeenCalled()
  })

  it('deletes an overlay for the authenticated user', async () => {
    vi.mocked(deleteAnalysisOverlay).mockResolvedValue({ success: true })

    const response = await DELETE(
      new NextRequest(
        'http://localhost/api/analyses/analysis-1/overlays/overlay-1'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: { success: true },
    })
    expect(deleteAnalysisOverlay).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'analysis-1',
      'overlay-1'
    )
  })

  it('maps overlay service errors to API errors', async () => {
    vi.mocked(deleteAnalysisOverlay).mockRejectedValue(
      new AnalysisOverlayServiceError(
        'NOT_FOUND',
        '오버레이를 찾을 수 없습니다.',
        404
      )
    )

    const response = await DELETE(
      new NextRequest(
        'http://localhost/api/analyses/analysis-1/overlays/overlay-1'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(404)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('maps unexpected delete errors to fallback API errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(deleteAnalysisOverlay).mockRejectedValue(new Error('db down'))

    const response = await DELETE(
      new NextRequest(
        'http://localhost/api/analyses/analysis-1/overlays/overlay-1'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'DB_ERROR',
        message: 'Overlay 삭제에 실패했습니다.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith(
      'Overlay 삭제에 실패했습니다.',
      expect.any(Error)
    )

    consoleError.mockRestore()
  })
})
