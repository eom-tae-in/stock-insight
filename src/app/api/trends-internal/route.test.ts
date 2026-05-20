import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'
import {
  fetchInternalTrendsData,
  TrendsProviderError,
} from '@/server/trends-internal-service'

vi.mock('@/server/trends-internal-service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/server/trends-internal-service')>()
  return {
    TrendsProviderError: actual.TrendsProviderError,
    fetchInternalTrendsData: vi.fn(),
  }
})

async function readJson(response: Response) {
  return response.json() as Promise<{
    error?: string
    code?: string
  }>
}

describe('trends-internal API route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    {
      method: 'GET',
      call: () =>
        GET(new NextRequest('http://localhost/api/trends-internal?keyword=')),
    },
    {
      method: 'POST',
      call: () =>
        POST(
          new NextRequest('http://localhost/api/trends-internal', {
            method: 'POST',
            body: JSON.stringify({ keyword: '' }),
          })
        ),
    },
  ])('rejects blank keyword for $method', async ({ call }) => {
    const response = await call()
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'Keyword is required' })
    expect(fetchInternalTrendsData).not.toHaveBeenCalled()
  })

  it.each([
    {
      method: 'GET',
      call: () =>
        GET(
          new NextRequest(
            'http://localhost/api/trends-internal?keyword=AI%20%20chips&geo=US&timeframe=today%205-y&gprop=news'
          )
        ),
    },
    {
      method: 'POST',
      call: () =>
        POST(
          new NextRequest('http://localhost/api/trends-internal', {
            method: 'POST',
            body: JSON.stringify({
              keyword: 'AI  chips',
              geo: 'US',
              timeframe: 'today 5-y',
              gprop: 'news',
            }),
          })
        ),
    },
  ])('fetches normalized trends data for $method', async ({ call }) => {
    const trends = [{ date: '2026-01-01', value: 50 }]
    vi.mocked(fetchInternalTrendsData).mockResolvedValue(trends)

    const response = await call()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(trends)
    expect(fetchInternalTrendsData).toHaveBeenCalledWith({
      keyword: 'AI chips',
      geo: 'US',
      timeframe: 'today 5-y',
      gprop: 'news',
    })
  })

  it('maps provider errors to provider status and code', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(fetchInternalTrendsData).mockRejectedValue(
      new TrendsProviderError(
        'TRENDS_RATE_LIMITED',
        'rate limited',
        'RATE_LIMIT',
        429
      )
    )

    const response = await GET(
      new NextRequest('http://localhost/api/trends-internal?keyword=AI')
    )
    const body = await readJson(response)

    expect(response.status).toBe(429)
    expect(body).toEqual({
      error: 'rate limited',
      code: 'TRENDS_RATE_LIMITED',
    })
    consoleError.mockRestore()
  })

  it('maps unknown failures to a 502 response', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(fetchInternalTrendsData).mockRejectedValue(new Error('down'))

    const response = await POST(
      new NextRequest('http://localhost/api/trends-internal', {
        method: 'POST',
        body: JSON.stringify({ keyword: 'AI' }),
      })
    )
    const body = await readJson(response)

    expect(response.status).toBe(502)
    expect(body).toEqual({
      error: 'down',
      code: 'TRENDS_FETCH_FAILED',
    })
    consoleError.mockRestore()
  })
})
