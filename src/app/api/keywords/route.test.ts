import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, PATCH, POST } from '@/app/api/keywords/route'
import { getKeywords, updateKeyword } from '@/server/keywords-service'
import { createKeywordWithAnalysis } from '@/server/keyword-creation-service'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/keywords-service', () => ({
  getKeywords: vi.fn(),
  updateKeyword: vi.fn(),
}))

vi.mock('@/server/keyword-creation-service', () => ({
  createKeywordWithAnalysis: vi.fn(),
}))

function authenticate(userId = 'user-1') {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
}

function jsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/keywords', {
    method: 'POST',
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

describe('keywords API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it.each([
    {
      action: 'listing keywords',
      call: () => GET(),
      service: getKeywords,
    },
    {
      action: 'creating a keyword',
      call: () => POST(jsonRequest({ keyword: 'AI' })),
      service: createKeywordWithAnalysis,
    },
    {
      action: 'updating a keyword',
      call: () => PATCH(jsonRequest({ id: 'keyword-1', keyword: 'AI' })),
      service: updateKeyword,
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

  it('returns authenticated keyword list from the keyword service', async () => {
    const keywords = [
      {
        id: 'keyword-1',
        keyword: 'AI',
        user_id: 'user-1',
      },
    ]
    vi.mocked(getKeywords).mockResolvedValue(keywords as never)

    const response = await GET()
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: keywords,
    })
    expect(getKeywords).toHaveBeenCalledWith(supabaseMock, 'user-1')
  })

  it('maps keyword list service failures to a 500 response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getKeywords).mockRejectedValue(new Error('database failed'))

    const response = await GET()
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'DB_ERROR',
        message: '키워드 목록을 불러오지 못했습니다.',
      },
    })
  })

  it('creates a keyword with analysis data and stock overlays', async () => {
    vi.mocked(createKeywordWithAnalysis).mockResolvedValue({
      id: 'keyword-1',
      keyword: 'AI',
    } as never)

    const requestBody = {
      keyword: 'AI',
      region: 'GLOBAL',
      search_type: 'WEB',
      chartData: [
        {
          date: '2026-01-01',
          trendsValue: 50,
          ma13Value: 48,
          yoyValue: 12,
        },
      ],
      overlays: [
        {
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
          overlayData: [
            {
              date: '2026-01-01',
              normalizedPrice: 70,
              rawPrice: 180,
            },
          ],
        },
      ],
    }

    const response = await POST(jsonRequest(requestBody))
    const body = await readJson(response)

    expect(response.status).toBe(201)
    expect(body).toMatchObject({
      success: true,
      data: { id: 'keyword-1', keyword: 'AI' },
    })
    expect(createKeywordWithAnalysis).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      requestBody
    )
  })

  it('maps keyword validation failures to a 400 response', async () => {
    vi.mocked(createKeywordWithAnalysis).mockRejectedValue(
      new Error('KEYWORD_REQUIRED')
    )

    const response = await POST(jsonRequest({ keyword: '' }))
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'INVALID_INPUT', message: '키워드가 필요합니다.' },
    })
  })

  it('maps unexpected keyword creation failures to a 500 response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(createKeywordWithAnalysis).mockRejectedValue(
      new Error('database failed')
    )

    const response = await POST(jsonRequest({ keyword: 'AI' }))
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'DB_ERROR',
        message: '키워드 저장 중 오류가 발생했습니다.',
      },
    })
  })

  it('rejects keyword updates without an id before calling the service', async () => {
    const response = await PATCH(jsonRequest({ keyword: 'AI' }))
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'INVALID_ID' },
    })
    expect(updateKeyword).not.toHaveBeenCalled()
  })

  it('updates a keyword through the keyword service', async () => {
    const updated = {
      id: 'keyword-1',
      keyword: 'AI chips',
    }
    vi.mocked(updateKeyword).mockResolvedValue(updated as never)

    const response = await PATCH(
      jsonRequest({ id: 'keyword-1', keyword: 'AI chips' })
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: updated,
    })
    expect(updateKeyword).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'keyword-1',
      'AI chips'
    )
  })

  it('returns 404 when an update target is not found', async () => {
    vi.mocked(updateKeyword).mockResolvedValue(null)

    const response = await PATCH(
      jsonRequest({ id: 'keyword-1', keyword: 'AI' })
    )
    const body = await readJson(response)

    expect(response.status).toBe(404)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('maps keyword update validation failures to a 400 response', async () => {
    vi.mocked(updateKeyword).mockRejectedValue(new Error('KEYWORD_REQUIRED'))

    const response = await PATCH(jsonRequest({ id: 'keyword-1', keyword: '' }))
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'INVALID_INPUT', message: '키워드가 필요합니다.' },
    })
  })

  it('maps unexpected keyword update failures to a 500 response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(updateKeyword).mockRejectedValue(new Error('database failed'))

    const response = await PATCH(
      jsonRequest({ id: 'keyword-1', keyword: 'AI' })
    )
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'DB_ERROR',
        message: '키워드 수정 중 오류가 발생했습니다.',
      },
    })
  })
})
