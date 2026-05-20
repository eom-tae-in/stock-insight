import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, GET } from './route'
import { deleteKeyword, getKeyword } from '@/server/keywords-service'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/keywords-service', () => ({
  deleteKeyword: vi.fn(),
  getKeyword: vi.fn(),
}))

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

describe('keyword detail API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it.each([
    {
      action: 'reading a keyword',
      call: () => GET(new Request('http://localhost'), params()),
      service: getKeyword,
    },
    {
      action: 'deleting a keyword',
      call: () => DELETE(new Request('http://localhost'), params()),
      service: deleteKeyword,
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
      action: 'reading a keyword',
      call: () => GET(new Request('http://localhost'), params('')),
      service: getKeyword,
    },
    {
      action: 'deleting a keyword',
      call: () => DELETE(new Request('http://localhost'), params('')),
      service: deleteKeyword,
    },
  ])('rejects invalid keyword id before $action', async ({ call, service }) => {
    const response = await call()
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'INVALID_ID' },
    })
    expect(service).not.toHaveBeenCalled()
  })

  it('returns a keyword for the authenticated user', async () => {
    const keyword = { id: 'keyword-1', keyword: 'AI' }
    vi.mocked(getKeyword).mockResolvedValue(keyword as never)

    const response = await GET(new Request('http://localhost'), params())
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: keyword,
    })
    expect(getKeyword).toHaveBeenCalledWith(supabaseMock, 'user-1', 'keyword-1')
  })

  it('returns 404 when the keyword cannot be found', async () => {
    vi.mocked(getKeyword).mockResolvedValue(null)

    const response = await GET(new Request('http://localhost'), params())
    const body = await readJson(response)

    expect(response.status).toBe(404)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('deletes a keyword for the authenticated user', async () => {
    vi.mocked(deleteKeyword).mockResolvedValue(true)

    const response = await DELETE(new Request('http://localhost'), params())
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: { id: 'keyword-1' },
    })
    expect(deleteKeyword).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'keyword-1'
    )
  })

  it('returns 404 when delete does not find a keyword', async () => {
    vi.mocked(deleteKeyword).mockResolvedValue(false)

    const response = await DELETE(new Request('http://localhost'), params())
    const body = await readJson(response)

    expect(response.status).toBe(404)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it.each([
    {
      action: 'fetching',
      call: () => GET(new Request('http://localhost'), params()),
      service: getKeyword,
      message: '키워드를 불러오지 못했습니다.',
    },
    {
      action: 'deleting',
      call: () => DELETE(new Request('http://localhost'), params()),
      service: deleteKeyword,
      message: '키워드 삭제 중 오류가 발생했습니다.',
    },
  ])(
    'maps unexpected $action errors to fallback API errors',
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
