import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/trends/route'
import { callPyTrendsAPI } from '@/lib/services/trends-service'
import { TrendsProviderError } from '@/server/trends-internal-service'

vi.mock('@/lib/services/trends-service', () => ({
  callPyTrendsAPI: vi.fn(),
}))

function trendsRequest(query: string) {
  return new NextRequest(`http://localhost/api/trends${query}`)
}

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean
    data?: unknown
    error?: { code: string; message: string }
  }>
}

describe('trends API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing keyword requests', async () => {
    const response = await GET(trendsRequest('?geo=GLOBAL'))
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'INVALID_KEYWORD' },
    })
    expect(callPyTrendsAPI).not.toHaveBeenCalled()
  })

  it.each([
    {
      query: '?keyword=%20%20%20',
      expectedMessage: '1~100자의 유효한 키워드를 입력하세요.',
    },
    {
      query: `?keyword=${'a'.repeat(101)}`,
      expectedMessage: '1~100자의 유효한 키워드를 입력하세요.',
    },
  ])(
    'rejects invalid keyword values %#',
    async ({ query, expectedMessage }) => {
      const response = await GET(trendsRequest(query))
      const body = await readJson(response)

      expect(response.status).toBe(400)
      expect(body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_KEYWORD',
          message: expectedMessage,
        },
      })
      expect(callPyTrendsAPI).not.toHaveBeenCalled()
    }
  )

  it('normalizes keyword spacing and calls the trends provider with parsed params', async () => {
    const rawTrendsData = [
      {
        date: '2026-01-01',
        value: 50,
        ma13Value: null,
        yoyValue: null,
      },
    ]
    vi.mocked(callPyTrendsAPI).mockResolvedValue(rawTrendsData)

    const response = await GET(
      trendsRequest(
        '?keyword=%20%20AI%20%20chips%20&geo=US&timeframe=5Y&gprop=WEB'
      )
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: {
        trendsData: rawTrendsData,
        keyword: 'AI chips',
      },
    })
    expect(callPyTrendsAPI).toHaveBeenCalledWith(
      'AI chips',
      'US',
      'today 5-y',
      ''
    )
  })

  it('returns a validation error when trends params cannot be parsed', async () => {
    const response = await GET(
      trendsRequest('?keyword=AI&geo=INVALID&timeframe=5Y&gprop=WEB')
    )
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'INVALID_TRENDS_PARAMS' },
    })
    expect(callPyTrendsAPI).not.toHaveBeenCalled()
  })

  it('maps retry-limited trends provider errors to the provider status', async () => {
    vi.mocked(callPyTrendsAPI).mockRejectedValue(
      new TrendsProviderError(
        'TRENDS_RATE_LIMITED',
        'rate limited',
        'RATE_LIMIT',
        429
      )
    )

    const response = await GET(trendsRequest('?keyword=AI'))
    const body = await readJson(response)

    expect(response.status).toBe(429)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'TRENDS_RATE_LIMITED',
        message:
          'Google Trends 요청이 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.',
      },
    })
  })

  it('maps non-rate-limited trends provider errors to the provider status', async () => {
    vi.mocked(callPyTrendsAPI).mockRejectedValue(
      new TrendsProviderError('NO_TRENDS_DATA', 'no data', 'NO_DATA', 404)
    )

    const response = await GET(trendsRequest('?keyword=AI'))
    const body = await readJson(response)

    expect(response.status).toBe(404)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'NO_TRENDS_DATA',
        message:
          '트렌드 데이터를 가져오지 못했습니다. 다른 키워드나 조건으로 시도해주세요.',
      },
    })
  })

  it('maps unknown trends provider failures to a generic 502 response', async () => {
    vi.mocked(callPyTrendsAPI).mockRejectedValue(new Error('network failed'))

    const response = await GET(trendsRequest('?keyword=AI'))
    const body = await readJson(response)

    expect(response.status).toBe(502)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'TRENDS_FETCH_FAILED',
        message:
          '트렌드 데이터를 가져오지 못했습니다. 다른 키워드로 시도해주세요.',
      },
    })
  })
})
