import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PATCH } from './route'
import {
  AnalysisServiceError,
  reorderOwnedAnalyses,
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
    reorderOwnedAnalyses: vi.fn(),
  }
})

function authenticate(userId = 'user-1') {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
}

function request(body: unknown) {
  return new NextRequest('http://localhost/api/analyses/reorder', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean
    data?: unknown
    error?: { code: string; message: string }
  }>
}

describe('analysis reorder API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it('returns unauthorized before reordering analyses', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const response = await PATCH(request({ orderedIds: ['analysis-1'] }))
    const body = await readJson(response)

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
    expect(reorderOwnedAnalyses).not.toHaveBeenCalled()
  })

  it('reorders analyses for the authenticated user', async () => {
    vi.mocked(reorderOwnedAnalyses).mockResolvedValue({ success: true })

    const response = await PATCH(
      request({ orderedIds: ['analysis-2', 'analysis-1'] })
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: { success: true },
    })
    expect(reorderOwnedAnalyses).toHaveBeenCalledWith(supabaseMock, 'user-1', [
      'analysis-2',
      'analysis-1',
    ])
  })

  it('maps analysis reorder service errors', async () => {
    vi.mocked(reorderOwnedAnalyses).mockRejectedValue(
      new AnalysisServiceError(
        'ANALYSIS_OWNERSHIP_MISMATCH',
        '조건 순서를 변경할 권한이 없습니다.',
        403
      )
    )

    const response = await PATCH(request({ orderedIds: ['analysis-1'] }))
    const body = await readJson(response)

    expect(response.status).toBe(403)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'ANALYSIS_OWNERSHIP_MISMATCH' },
    })
  })

  it('maps unexpected reorder errors to fallback API errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(reorderOwnedAnalyses).mockRejectedValue(new Error('db down'))

    const response = await PATCH(request({ orderedIds: ['analysis-1'] }))
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'DB_ERROR',
        message: '조건 순서 저장 중 오류가 발생했습니다.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith(
      'Error reordering analyses:',
      expect.any(Error)
    )

    consoleError.mockRestore()
  })
})
