import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, GET } from './route'
import {
  deleteSavedSearch,
  getSavedSearch,
} from '@/server/stock-search-service'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/stock-search-service', () => ({
  deleteSavedSearch: vi.fn(),
  getSavedSearch: vi.fn(),
}))

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

describe('search detail API route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it.each([
    {
      action: 'reading a saved search',
      call: () =>
        GET(
          new NextRequest('http://localhost/api/searches/search-1'),
          params()
        ),
      service: getSavedSearch,
    },
    {
      action: 'deleting a saved search',
      call: () =>
        DELETE(
          new NextRequest('http://localhost/api/searches/search-1'),
          params()
        ),
      service: deleteSavedSearch,
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

  it.each([
    {
      action: 'reading',
      call: () =>
        GET(new NextRequest('http://localhost/api/searches/'), params('')),
      service: getSavedSearch,
    },
    {
      action: 'deleting',
      call: () =>
        DELETE(new NextRequest('http://localhost/api/searches/'), params('')),
      service: deleteSavedSearch,
    },
  ])(
    'rejects invalid id before $action a search',
    async ({ call, service }) => {
      const response = await call()
      const body = await readJson(response)

      expect(response.status).toBe(400)
      expect(body).toMatchObject({
        success: false,
        error: { code: 'INVALID_ID' },
      })
      expect(service).not.toHaveBeenCalled()
    }
  )

  it('returns a saved search for the authenticated user', async () => {
    const search = { id: 'search-1', ticker: 'AAPL' }
    vi.mocked(getSavedSearch).mockResolvedValue(search as never)

    const response = await GET(
      new NextRequest('http://localhost/api/searches/search-1'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: search,
    })
    expect(getSavedSearch).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'search-1'
    )
  })

  it.each([
    {
      action: 'reading',
      call: () =>
        GET(
          new NextRequest('http://localhost/api/searches/search-1'),
          params()
        ),
      service: getSavedSearch,
    },
    {
      action: 'deleting',
      call: () =>
        DELETE(
          new NextRequest('http://localhost/api/searches/search-1'),
          params()
        ),
      service: deleteSavedSearch,
    },
  ])(
    'returns 404 when $action target cannot be found',
    async ({ call, service }) => {
      vi.mocked(service).mockResolvedValue(null as never)

      const response = await call()
      const body = await readJson(response)

      expect(response.status).toBe(404)
      expect(body).toMatchObject({
        success: false,
        error: { code: 'NOT_FOUND' },
      })
    }
  )

  it('deletes a saved search for the authenticated user', async () => {
    vi.mocked(deleteSavedSearch).mockResolvedValue(true)

    const response = await DELETE(
      new NextRequest('http://localhost/api/searches/search-1'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: { id: 'search-1' },
    })
    expect(deleteSavedSearch).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'search-1'
    )
  })

  it.each([
    {
      action: 'reading',
      call: () =>
        GET(
          new NextRequest('http://localhost/api/searches/search-1'),
          params()
        ),
      service: getSavedSearch,
      message: '종목 조회 중 오류가 발생했습니다.',
    },
    {
      action: 'deleting',
      call: () =>
        DELETE(
          new NextRequest('http://localhost/api/searches/search-1'),
          params()
        ),
      service: deleteSavedSearch,
      message: '종목 삭제 중 오류가 발생했습니다.',
    },
  ])(
    'maps unexpected $action failures to fallback API errors',
    async ({ call, service, message }) => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined)
      vi.mocked(service).mockRejectedValue(new Error('db down'))

      const response = await call()
      const body = await readJson(response)

      expect(response.status).toBe(500)
      expect(body).toMatchObject({
        success: false,
        error: {
          code: 'DB_ERROR',
          message,
        },
      })

      consoleError.mockRestore()
    }
  )
})
