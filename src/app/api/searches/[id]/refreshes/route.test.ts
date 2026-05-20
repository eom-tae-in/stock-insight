import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import {
  refreshSavedSearch,
  StockRefreshServiceError,
} from '@/server/stock-refresh-service'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/stock-refresh-service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/server/stock-refresh-service')>()

  return {
    StockRefreshServiceError: actual.StockRefreshServiceError,
    refreshSavedSearch: vi.fn(),
  }
})

function authenticate(userId = 'user-1') {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
}

function params(id = 'search-1') {
  return { params: Promise.resolve({ id }) }
}

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean
    data?: unknown
    error?: { code: string; message: string }
  }>
}

describe('search refresh API route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it('returns unauthorized before refreshing a saved search', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const response = await POST(
      new NextRequest('http://localhost/api/searches/search-1/refreshes'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
    expect(refreshSavedSearch).not.toHaveBeenCalled()
  })

  it('refreshes a saved search for the authenticated user', async () => {
    const refreshed = { id: 'search-1', ticker: 'AAPL' }
    vi.mocked(refreshSavedSearch).mockResolvedValue(refreshed as never)

    const response = await POST(
      new NextRequest('http://localhost/api/searches/search-1/refreshes'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: refreshed,
    })
    expect(refreshSavedSearch).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'search-1'
    )
  })

  it('maps stock refresh service errors to API errors', async () => {
    vi.mocked(refreshSavedSearch).mockRejectedValue(
      new StockRefreshServiceError(
        'NOT_FOUND',
        '해당 종목을 찾을 수 없습니다.',
        404
      )
    )

    const response = await POST(
      new NextRequest('http://localhost/api/searches/search-1/refreshes'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(404)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '해당 종목을 찾을 수 없습니다.',
      },
    })
  })

  it('maps unexpected refresh failures to fallback API errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(refreshSavedSearch).mockRejectedValue(new Error('db down'))

    const response = await POST(
      new NextRequest('http://localhost/api/searches/search-1/refreshes'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'REFRESH_FAILED',
        message: '종목 최신화에 실패했습니다.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith(
      '종목 최신화에 실패했습니다.',
      expect.any(Error)
    )

    consoleError.mockRestore()
  })
})
