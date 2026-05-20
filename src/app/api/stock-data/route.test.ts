import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'
import { getStockAnalysisData } from '@/server/stock-analysis-service'

vi.mock('@/server/stock-analysis-service', () => ({
  getStockAnalysisData: vi.fn(),
}))

function request(query: string) {
  return new NextRequest(`http://localhost/api/stock-data${query}`)
}

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean
    data?: unknown
    error?: { code: string; message: string; details?: unknown }
  }>
}

describe('stock-data API route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    {
      name: 'missing ticker',
      query: '?period=5Y&interval=1wk',
    },
    {
      name: 'blank ticker',
      query: '?ticker=',
    },
  ])('rejects $name before fetching stock data', async ({ query }) => {
    const response = await GET(request(query))
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'INVALID_TICKER' },
    })
    expect(getStockAnalysisData).not.toHaveBeenCalled()
  })

  it.each([
    {
      name: 'unsupported period',
      query: '?ticker=AAPL&period=1Y&interval=1wk',
    },
    {
      name: 'unsupported interval',
      query: '?ticker=AAPL&period=5Y&interval=1d',
    },
  ])('rejects $name before fetching stock data', async ({ query }) => {
    const response = await GET(request(query))
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'UNSUPPORTED_STOCK_DATA_RANGE' },
    })
    expect(getStockAnalysisData).not.toHaveBeenCalled()
  })

  it('returns stock analysis data for the supported range', async () => {
    const stockData = {
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      currentPrice: 180,
      previousClose: 178,
      period: '5Y',
      interval: '1wk',
      priceData: [{ date: '2026-01-01', close: 180 }],
    }
    vi.mocked(getStockAnalysisData).mockResolvedValue(stockData as never)

    const response = await GET(request('?ticker=AAPL&period=5Y&interval=1wk'))
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: stockData,
    })
    expect(getStockAnalysisData).toHaveBeenCalledWith('AAPL', '5Y', '1wk')
  })

  it('maps missing stock data to a 404 response', async () => {
    vi.mocked(getStockAnalysisData).mockResolvedValue(null)

    const response = await GET(request('?ticker=AAPL'))
    const body = await readJson(response)

    expect(response.status).toBe(404)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'STOCK_DATA_NOT_FOUND' },
    })
  })

  it('maps no-price-data errors to a ticker-not-found response', async () => {
    vi.mocked(getStockAnalysisData).mockRejectedValue(
      new Error('No price data found')
    )

    const response = await GET(request('?ticker=AAPL'))
    const body = await readJson(response)

    expect(response.status).toBe(404)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'TICKER_NOT_FOUND' },
    })
  })

  it('maps unexpected stock data failures to a 502 response', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(getStockAnalysisData).mockRejectedValue(
      new Error('upstream down')
    )

    const response = await GET(request('?ticker=AAPL'))
    const body = await readJson(response)

    expect(response.status).toBe(502)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'STOCK_DATA_FETCH_FAILED',
        message: '종목 데이터를 가져오지 못했습니다.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith(
      'Error in GET /api/stock-data:',
      expect.any(Error)
    )

    consoleError.mockRestore()
  })
})
