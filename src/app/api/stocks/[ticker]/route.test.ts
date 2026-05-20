import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'
import { fetchCachedStockData } from '@/server/cached-stock-service'

const supabaseMock = vi.hoisted(() => ({ auth: { getUser: vi.fn() } }))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/cached-stock-service', () => ({
  fetchCachedStockData: vi.fn(),
}))

function authenticate(userId = 'user-1') {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
}

function params(ticker = 'aapl') {
  return { params: Promise.resolve({ ticker }) }
}

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean
    data?: unknown
    error?: { code: string; message: string }
  }>
}

describe('stock ticker API route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it('returns unauthorized before fetching stock data', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const response = await GET(
      new NextRequest('http://localhost/api/stocks/aapl'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
    expect(fetchCachedStockData).not.toHaveBeenCalled()
  })

  it('rejects blank ticker before fetching stock data', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/stocks/%20'),
      params(' ')
    )
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'INVALID_PARAMS' },
    })
    expect(fetchCachedStockData).not.toHaveBeenCalled()
  })

  it('returns overlay stock price series for the authenticated user', async () => {
    vi.mocked(fetchCachedStockData).mockResolvedValue({
      companyName: 'Apple Inc.',
      currentPrice: 120,
      previousClose: 110,
      currency: 'USD',
      priceData: [
        { date: '2026-01-01', close: 100 },
        { date: '2026-01-08', close: 120 },
      ],
    })

    const response = await GET(
      new NextRequest('http://localhost/api/stocks/aapl'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: {
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        priceData: [
          { date: '2026-01-01', price: 100 },
          { date: '2026-01-08', price: 120 },
        ],
      },
    })
    expect(fetchCachedStockData).toHaveBeenCalledWith('AAPL')
  })

  it('maps stock fetch failures to API errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(fetchCachedStockData).mockRejectedValue(new Error('Yahoo down'))

    const response = await GET(
      new NextRequest('http://localhost/api/stocks/aapl'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'STOCK_ERROR', message: 'Yahoo down' },
    })
    consoleError.mockRestore()
  })
})
