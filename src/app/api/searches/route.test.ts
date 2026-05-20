import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'
import {
  saveStockAnalysisAsSearch,
  StockAnalysisServiceError,
} from '@/server/stock-analysis-service'
import { getSavedSearches } from '@/server/stock-search-service'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/stock-search-service', () => ({
  getSavedSearches: vi.fn(),
}))

vi.mock('@/server/stock-analysis-service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/server/stock-analysis-service')>()

  return {
    StockAnalysisServiceError: actual.StockAnalysisServiceError,
    saveStockAnalysisAsSearch: vi.fn(),
  }
})

function authenticate(userId = 'user-1') {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
}

function request(body: unknown) {
  return new NextRequest('http://localhost/api/searches', {
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

const validSaveBody = {
  ticker: 'AAPL',
  companyName: 'Apple Inc.',
  currency: 'USD',
  priceData: [
    {
      date: '2026-01-01',
      open: 100,
      high: 120,
      low: 90,
      close: 110,
    },
  ],
}

describe('searches API route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it.each([
    {
      action: 'listing searches',
      call: () => GET(),
      service: getSavedSearches,
    },
    {
      action: 'saving a search',
      call: () => POST(request(validSaveBody)),
      service: saveStockAnalysisAsSearch,
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

  it('lists saved searches for the authenticated user', async () => {
    const records = [{ id: 'search-1', ticker: 'AAPL' }]
    vi.mocked(getSavedSearches).mockResolvedValue(records as never)

    const response = await GET()
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: records,
    })
    expect(getSavedSearches).toHaveBeenCalledWith(supabaseMock, 'user-1')
  })

  it('rejects invalid save body before calling the service', async () => {
    const response = await POST(request({ ticker: '', priceData: [] }))
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'INVALID_STOCK_DATA' },
    })
    expect(saveStockAnalysisAsSearch).not.toHaveBeenCalled()
  })

  it('saves stock analysis data as a search record', async () => {
    const savedSearch = { id: 'search-1', ticker: 'AAPL' }
    vi.mocked(saveStockAnalysisAsSearch).mockResolvedValue(savedSearch)

    const response = await POST(request(validSaveBody))
    const body = await readJson(response)

    expect(response.status).toBe(201)
    expect(body).toMatchObject({
      success: true,
      data: savedSearch,
    })
    expect(saveStockAnalysisAsSearch).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      validSaveBody
    )
  })

  it('maps stock analysis service errors to API errors', async () => {
    vi.mocked(saveStockAnalysisAsSearch).mockRejectedValue(
      new StockAnalysisServiceError(
        'ALREADY_SAVED',
        '이미 저장된 종목입니다.',
        409
      )
    )

    const response = await POST(request(validSaveBody))
    const body = await readJson(response)

    expect(response.status).toBe(409)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'ALREADY_SAVED',
        message: '이미 저장된 종목입니다.',
      },
    })
  })

  it.each([
    {
      action: 'listing',
      call: () => GET(),
      service: getSavedSearches,
      code: 'DB_ERROR',
      message: '종목 목록을 가져올 수 없습니다.',
    },
    {
      action: 'saving',
      call: () => POST(request(validSaveBody)),
      service: saveStockAnalysisAsSearch,
      code: 'SAVE_FAILED',
      message: '종목 저장 중 오류가 발생했습니다.',
    },
  ])(
    'maps unexpected $action failures to fallback API errors',
    async ({ call, service, code, message }) => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined)
      vi.mocked(service).mockRejectedValue(new Error('db down'))

      const response = await call()
      const body = await readJson(response)

      expect(response.status).toBe(500)
      expect(body).toMatchObject({
        success: false,
        error: { code, message },
      })

      consoleError.mockRestore()
    }
  )
})
