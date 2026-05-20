import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PATCH } from './route'
import { reorderKeywords } from '@/server/keywords-service'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/keywords-service', () => ({
  reorderKeywords: vi.fn(),
}))

function authenticate(userId = 'user-1') {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
}

function request(body: unknown) {
  return new NextRequest('http://localhost/api/keywords/reorder', {
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

describe('keyword reorder API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it('returns unauthorized before reordering keywords', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const response = await PATCH(request({ orderedIds: ['keyword-1'] }))
    const body = await readJson(response)

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
    expect(reorderKeywords).not.toHaveBeenCalled()
  })

  it.each([{ body: {} }, { body: { orderedIds: ['keyword-1', 2] } }])(
    'rejects invalid reorder body %#',
    async ({ body }) => {
      const response = await PATCH(request(body))
      const responseBody = await readJson(response)

      expect(response.status).toBe(400)
      expect(responseBody).toMatchObject({
        success: false,
        error: { code: 'INVALID_ORDER' },
      })
      expect(reorderKeywords).not.toHaveBeenCalled()
    }
  )

  it('reorders keywords for the authenticated user', async () => {
    const orderedIds = ['keyword-2', 'keyword-1']

    const response = await PATCH(request({ orderedIds }))
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: { orderedIds },
    })
    expect(reorderKeywords).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      orderedIds
    )
  })

  it('maps unexpected reorder errors to fallback API errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(reorderKeywords).mockRejectedValue(new Error('db down'))

    const response = await PATCH(request({ orderedIds: ['keyword-1'] }))
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'DB_ERROR',
        message: '키워드 순서 저장 중 오류가 발생했습니다.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith(
      'Error reordering keywords:',
      expect.any(Error)
    )

    consoleError.mockRestore()
  })
})
