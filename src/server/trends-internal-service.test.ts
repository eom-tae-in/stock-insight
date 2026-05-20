import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildTrendsDataWithIndicators,
  fetchInternalTrendsData,
  TrendsProviderError,
} from './trends-internal-service'

describe('trends-internal-service', () => {
  beforeEach(() => {
    vi.stubEnv('PYTRENDS_INTERNAL_SECRET', 'test-secret')
    vi.stubEnv('PORT', '3000')
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    vi.stubGlobal('fetch', vi.fn())
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('fetchInternalTrendsData', () => {
    it('rejects blank keywords before calling the provider', async () => {
      await expect(fetchInternalTrendsData({ keyword: '   ' })).rejects.toThrow(
        'Keyword is required'
      )
      expect(fetch).not.toHaveBeenCalled()
    })

    it('calls the internal pytrends route and parses valid data', async () => {
      vi.mocked(fetch).mockResolvedValue(
        Response.json({
          success: true,
          data: [
            { date: '2026-01-01', value: 50 },
            { date: '2026-01-08', value: 60 },
          ],
        })
      )

      const result = await fetchInternalTrendsData({
        keyword: '  AI   chips ',
        geo: 'US',
        timeframe: 'today 5-y',
        gprop: '',
      })

      expect(result).toEqual([
        { date: '2026-01-01', value: 50 },
        { date: '2026-01-08', value: 60 },
      ])
      expect(fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:3000/api/pytrends',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-secret': 'test-secret',
          },
          body: JSON.stringify({
            keyword: 'AI chips',
            geo: 'US',
            timeframe: 'today 5-y',
            gprop: '',
          }),
          cache: 'no-store',
        })
      )
    })

    it('returns cached Redis trends data without calling pytrends', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.com/')
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'redis-token')
      vi.mocked(fetch).mockResolvedValue(
        Response.json({
          result: JSON.stringify([
            {
              date: '2026-01-01',
              value: 50,
            },
          ]),
        })
      )

      await expect(fetchInternalTrendsData({ keyword: 'AI' })).resolves.toEqual(
        [
          {
            date: '2026-01-01',
            value: 50,
          },
        ]
      )
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /^https:\/\/redis\.example\.com\/get\/trends-data%3Av1%3A/
        ),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer redis-token',
          },
        })
      )
    })

    it('stores successful pytrends data in Redis when cache is configured', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.com/')
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'redis-token')
      vi.mocked(fetch)
        .mockResolvedValueOnce(Response.json({ result: null }))
        .mockResolvedValueOnce(
          Response.json({
            success: true,
            data: [
              {
                date: '2026-01-01',
                value: 50,
              },
            ],
          })
        )
        .mockResolvedValueOnce(Response.json({ result: 'OK' }))

      await expect(fetchInternalTrendsData({ keyword: 'AI' })).resolves.toEqual(
        [
          {
            date: '2026-01-01',
            value: 50,
          },
        ]
      )
      expect(fetch).toHaveBeenCalledTimes(3)
      expect(vi.mocked(fetch).mock.calls[2]?.[0]).toEqual(
        expect.stringMatching(
          /^https:\/\/redis\.example\.com\/set\/trends-data%3Av1%3A/
        )
      )
      expect(vi.mocked(fetch).mock.calls[2]?.[1]).toEqual(
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer redis-token',
          },
        })
      )
    })

    it('throws a provider error when the internal secret is missing', async () => {
      vi.stubEnv('PYTRENDS_INTERNAL_SECRET', '')

      await expect(
        fetchInternalTrendsData({ keyword: 'AI' })
      ).rejects.toMatchObject({
        code: 'PYTRENDS_INTERNAL_SECRET_MISSING',
        status: 500,
      })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('throws a provider error when the internal pytrends response is invalid', async () => {
      vi.mocked(fetch).mockImplementation(async () =>
        Response.json({
          success: true,
          data: [{ date: '2026-01-01', value: 'bad' }],
        })
      )

      await expect(
        fetchInternalTrendsData({ keyword: 'AI' })
      ).rejects.toMatchObject({
        code: 'NO_TRENDS_DATA',
        status: 502,
      })
    })

    it('throws a provider error when pytrends returns invalid JSON', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response('not-json', {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        })
      )

      await expect(
        fetchInternalTrendsData({ keyword: 'AI' })
      ).rejects.toMatchObject({
        code: 'PYTRENDS_FUNCTION_INVALID_RESPONSE',
        status: 502,
      })
    })

    it('throws a provider error when pytrends returns an unsuccessful payload', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          Response.json({
            success: false,
            data: [],
          })
        )
        .mockResolvedValueOnce(
          Response.json({
            success: false,
            data: [],
          })
        )

      await expect(
        fetchInternalTrendsData({ keyword: 'AI' })
      ).rejects.toMatchObject({
        code: 'PYTRENDS_FUNCTION_FAILED',
        status: 502,
      })
    })

    it('maps internal pytrends HTTP failures to TrendsProviderError', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        Response.json(
          {
            code: 'PYTRENDS_BAD_REQUEST',
            error: 'bad request',
          },
          {
            status: 400,
            statusText: 'Bad Request',
          }
        )
      )

      const error = await fetchInternalTrendsData({ keyword: 'AI' }).catch(
        caught => caught
      )

      expect(error).toBeInstanceOf(TrendsProviderError)
      expect(error).toMatchObject({
        code: 'PYTRENDS_BAD_REQUEST',
        status: 400,
      })
    })

    it('classifies local 404 pytrends responses as unavailable route errors', async () => {
      vi.mocked(fetch).mockResolvedValue(
        Response.json(
          {
            code: 'NOT_FOUND',
            error: 'not found',
          },
          {
            status: 404,
            statusText: 'Not Found',
          }
        )
      )

      await expect(
        fetchInternalTrendsData({ keyword: 'AI' })
      ).rejects.toMatchObject({
        code: 'PYTRENDS_ROUTE_UNAVAILABLE',
        status: 404,
      })
    })

    it('retries rate-limited pytrends responses and returns data after recovery', async () => {
      vi.spyOn(global, 'setTimeout').mockImplementation(callback => {
        if (typeof callback === 'function') {
          callback()
        }
        return 0 as unknown as ReturnType<typeof setTimeout>
      })
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          Response.json(
            {
              code: 'TRENDS_RATE_LIMITED',
              error: 'rate limited',
            },
            {
              status: 429,
              statusText: 'Too Many Requests',
            }
          )
        )
        .mockResolvedValueOnce(
          Response.json({
            success: true,
            data: [
              {
                date: '2026-01-01',
                value: 50,
              },
            ],
          })
        )

      await expect(fetchInternalTrendsData({ keyword: 'AI' })).resolves.toEqual(
        [
          {
            date: '2026-01-01',
            value: 50,
          },
        ]
      )
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('throws a persisted rate limit error after retries are exhausted', async () => {
      vi.spyOn(global, 'setTimeout').mockImplementation(callback => {
        if (typeof callback === 'function') {
          callback()
        }
        return 0 as unknown as ReturnType<typeof setTimeout>
      })
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          Response.json(
            {
              code: 'TRENDS_RATE_LIMITED',
              error: 'rate limited',
            },
            {
              status: 429,
              statusText: 'Too Many Requests',
            }
          )
        )
        .mockResolvedValueOnce(
          Response.json(
            {
              code: 'TRENDS_RATE_LIMITED',
              error: 'rate limited',
            },
            {
              status: 429,
              statusText: 'Too Many Requests',
            }
          )
        )

      await expect(
        fetchInternalTrendsData({ keyword: 'AI' })
      ).rejects.toMatchObject({
        code: 'TRENDS_RATE_LIMITED',
        message: 'Google Trends rate limit persisted after 2 attempts',
        status: 429,
      })
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('buildTrendsDataWithIndicators', () => {
    it('keeps empty indicator values when there is not enough history', () => {
      expect(
        buildTrendsDataWithIndicators([{ date: '2026-01-01', value: 50 }])
      ).toEqual([
        {
          date: '2026-01-01',
          value: 50,
          ma13Value: null,
          yoyValue: null,
        },
      ])
    })

    it('calculates YoY values when at least 52 weeks of history exists', () => {
      const rawTrendsData = Array.from({ length: 65 }, (_, index) => ({
        date: `2026-W${String(index + 1).padStart(2, '0')}`,
        value: index < 13 ? 10 : 20,
      }))

      const result = buildTrendsDataWithIndicators(rawTrendsData)

      expect(result.at(-1)).toMatchObject({
        ma13Value: 20,
        yoyValue: 100,
      })
    })
  })
})
