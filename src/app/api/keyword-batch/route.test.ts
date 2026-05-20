import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import { fetchCachedStockData } from '@/server/cached-stock-service'
import { getKeywordAnalysis } from '@/server/keyword-analyses-service'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/cached-stock-service', () => ({
  fetchCachedStockData: vi.fn(),
}))

vi.mock('@/server/keyword-analyses-service', () => ({
  getKeywordAnalysis: vi.fn(),
}))

function authenticate(userId = 'user-1') {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
}

function request(body: unknown) {
  return new NextRequest('http://localhost/api/keyword-batch', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean
    data?: unknown
    error?: { code: string; message: string; details?: unknown }
  }>
}

describe('keyword batch API route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it('returns unauthorized before reading batch data', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const response = await POST(
      request({ keywordId: 'keyword-1', symbols: ['AAPL'] })
    )
    const body = await readJson(response)

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
    expect(getKeywordAnalysis).not.toHaveBeenCalled()
  })

  it.each([
    { body: { symbols: ['AAPL'] } },
    { body: { keywordId: 'keyword-1', symbols: [] } },
    { body: { keywordId: 'keyword-1', symbols: 'AAPL' } },
    { body: { keywordId: 'keyword-1', symbols: Array(51).fill('AAPL') } },
  ])('rejects invalid batch request %#', async ({ body }) => {
    const response = await POST(request(body))
    const responseBody = await readJson(response)

    expect(response.status).toBe(400)
    expect(responseBody).toMatchObject({
      success: false,
      error: { code: 'INVALID_REQUEST' },
    })
  })

  it('returns keyword trends and fetched stocks', async () => {
    const trends = [{ date: '2026-01-01', value: 50 }]
    const stockData = {
      companyName: 'Apple Inc.',
      currentPrice: 120,
      previousClose: 110,
      priceData: [{ date: '2026-01-01', close: 120 }],
    }
    vi.mocked(getKeywordAnalysis).mockResolvedValue({
      id: 'analysis-1',
      trends_data: trends,
    } as never)
    vi.mocked(fetchCachedStockData).mockResolvedValue(stockData)

    const response = await POST(
      request({ keywordId: 'keyword-1', symbols: ['AAPL'] })
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: {
        trends,
        stocks: {
          AAPL: stockData,
        },
      },
    })
    expect(getKeywordAnalysis).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'keyword-1',
      'GLOBAL',
      '5Y',
      'WEB'
    )
  })

  it('returns 404 when keyword analysis cannot be found', async () => {
    vi.mocked(getKeywordAnalysis).mockResolvedValue(null)

    const response = await POST(
      request({ keywordId: 'keyword-1', symbols: ['AAPL'] })
    )
    const body = await readJson(response)

    expect(response.status).toBe(404)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'KEYWORD_NOT_FOUND' },
    })
  })

  it('maps trends lookup failures to a 502 response', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(getKeywordAnalysis).mockRejectedValue(new Error('trends down'))

    const response = await POST(
      request({ keywordId: 'keyword-1', symbols: ['AAPL'] })
    )
    const body = await readJson(response)

    expect(response.status).toBe(502)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'TRENDS_FETCH_FAILED' },
    })
    consoleError.mockRestore()
  })

  it('returns failed symbols when all stock lookups fail', async () => {
    const consoleWarn = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)
    vi.mocked(getKeywordAnalysis).mockResolvedValue({
      id: 'analysis-1',
      trends_data: [],
    } as never)
    vi.mocked(fetchCachedStockData).mockRejectedValue(new Error('stock down'))

    const response = await POST(
      request({ keywordId: 'keyword-1', symbols: ['AAPL'] })
    )
    const body = await readJson(response)

    expect(response.status).toBe(502)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'STOCKS_FETCH_FAILED' },
    })
    consoleWarn.mockRestore()
  })
})
