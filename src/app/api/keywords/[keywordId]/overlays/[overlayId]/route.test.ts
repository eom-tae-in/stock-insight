import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE } from './route'
import {
  ApiServiceError,
  deleteKeywordOverlay,
} from '@/server/keyword-overlays-service'

const supabaseMock = vi.hoisted(() => ({ auth: { getUser: vi.fn() } }))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/keyword-overlays-service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/server/keyword-overlays-service')>()
  return {
    ApiServiceError: actual.ApiServiceError,
    deleteKeywordOverlay: vi.fn(),
  }
})

function authenticate(userId = 'user-1') {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
}

function params(keywordId = 'keyword-1', overlayId = 'overlay-1') {
  return { params: Promise.resolve({ keywordId, overlayId }) }
}

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean
    data?: unknown
    error?: { code: string; message: string }
  }>
}

describe('keyword overlay detail API route handler', () => {
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
        'http://localhost/api/keywords/keyword-1/overlays/overlay-1'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
    expect(deleteKeywordOverlay).not.toHaveBeenCalled()
  })

  it('deletes a keyword overlay for the authenticated user', async () => {
    vi.mocked(deleteKeywordOverlay).mockResolvedValue({ success: true })

    const response = await DELETE(
      new NextRequest(
        'http://localhost/api/keywords/keyword-1/overlays/overlay-1'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: { success: true },
    })
    expect(deleteKeywordOverlay).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'keyword-1',
      'overlay-1'
    )
  })

  it('maps keyword overlay service errors to API errors', async () => {
    vi.mocked(deleteKeywordOverlay).mockRejectedValue(
      new ApiServiceError('NOT_FOUND', '오버레이를 찾을 수 없습니다.', 404)
    )

    const response = await DELETE(
      new NextRequest(
        'http://localhost/api/keywords/keyword-1/overlays/overlay-1'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(404)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND', message: '오버레이를 찾을 수 없습니다.' },
    })
  })

  it('maps unexpected delete failures to fallback API errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(deleteKeywordOverlay).mockRejectedValue(new Error('db down'))

    const response = await DELETE(
      new NextRequest(
        'http://localhost/api/keywords/keyword-1/overlays/overlay-1'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'DB_ERROR',
        message: '오버레이 삭제 중 오류가 발생했습니다.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith(
      'Error deleting overlay:',
      expect.any(Error)
    )
    consoleError.mockRestore()
  })
})
