import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'
import { findSavedStockSuggestions } from '@/server/stock-search-service'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
}))

const yahooSearchMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/stock-search-service', () => ({
  findSavedStockSuggestions: vi.fn(),
}))

vi.mock('yahoo-finance2', () => ({
  default: vi.fn(function YahooFinanceMock() {
    return {
      search: yahooSearchMock,
    }
  }),
}))

function authenticate(userId = 'user-1') {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
}

function request(query = '?q=AAPL') {
  return new NextRequest(`http://localhost/api/stocks/search${query}`)
}

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean
    data?: Array<{
      ticker: string
      symbol: string
      companyName: string
      longname: string
    }>
    error?: { code: string; message: string }
  }>
}

describe('stocks search API route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it('returns unauthorized before searching stocks', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const response = await GET(request())
    const body = await readJson(response)

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
    expect(yahooSearchMock).not.toHaveBeenCalled()
    expect(findSavedStockSuggestions).not.toHaveBeenCalled()
  })

  it('returns an empty list for blank query', async () => {
    const response = await GET(request('?q='))
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: [],
    })
    expect(yahooSearchMock).not.toHaveBeenCalled()
  })

  it('combines saved stock suggestions before Yahoo Finance results', async () => {
    vi.mocked(findSavedStockSuggestions).mockResolvedValue([
      { ticker: 'AAPL', companyName: 'Saved Apple' },
    ])
    yahooSearchMock.mockResolvedValue({
      quotes: [
        {
          quoteType: 'EQUITY',
          symbol: 'AAPL',
          longname: 'Apple Inc.',
        },
        {
          quoteType: 'EQUITY',
          symbol: 'MSFT',
          shortname: 'Microsoft',
        },
        {
          quoteType: 'ETF',
          symbol: 'SPY',
          longname: 'SPDR S&P 500 ETF',
        },
      ],
    })

    const response = await GET(request('?q=app'))
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.data).toEqual([
      {
        ticker: 'AAPL',
        symbol: 'AAPL',
        companyName: 'Saved Apple',
        longname: 'Saved Apple',
      },
      {
        ticker: 'MSFT',
        symbol: 'MSFT',
        companyName: 'Microsoft',
        longname: 'Microsoft',
      },
    ])
    expect(yahooSearchMock).toHaveBeenCalledWith('app', {
      enableFuzzyQuery: true,
      quotesCount: 10,
    })
    expect(findSavedStockSuggestions).toHaveBeenCalledWith(
      supabaseMock,
      'app',
      5
    )
  })

  it('falls back to saved stock suggestions when Yahoo Finance fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    yahooSearchMock.mockRejectedValue(new Error('Yahoo down'))
    vi.mocked(findSavedStockSuggestions).mockResolvedValue([
      { ticker: 'TSLA', companyName: 'Tesla Inc.' },
    ])

    const response = await GET(request('?q=tesla'))
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.data).toEqual([
      {
        ticker: 'TSLA',
        symbol: 'TSLA',
        companyName: 'Tesla Inc.',
        longname: 'Tesla Inc.',
      },
    ])
    expect(findSavedStockSuggestions).toHaveBeenLastCalledWith(
      supabaseMock,
      'tesla',
      10
    )

    consoleError.mockRestore()
  })

  it('maps unexpected search failures to a 500 response', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    yahooSearchMock.mockRejectedValue(new Error('Yahoo down'))
    vi.mocked(findSavedStockSuggestions).mockRejectedValue(new Error('db down'))

    const response = await GET(request('?q=AAPL'))
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: '종목 검색에 실패했습니다.',
      },
    })

    consoleError.mockRestore()
  })
})
