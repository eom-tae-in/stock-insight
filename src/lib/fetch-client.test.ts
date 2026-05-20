import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError, apiFetch, apiFetchJson } from './fetch-client'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the fetch response for non-401 responses', async () => {
    const response = new Response(null, { status: 204 })
    vi.mocked(fetch).mockResolvedValue(response)

    await expect(apiFetch('/api/health')).resolves.toBe(response)
  })

  it('redirects 401 responses to login with the current path as next', async () => {
    const windowMock = {
      location: {
        pathname: '/stock-analysis',
        search: '?tab=saved',
        href: '',
      },
    }
    vi.stubGlobal('window', windowMock)
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }))

    const pending = apiFetch('/api/protected')

    await Promise.resolve()

    expect(windowMock.location.href).toBe(
      '/login?next=%2Fstock-analysis%3Ftab%3Dsaved'
    )
    await expect(
      Promise.race([pending, Promise.resolve('still-pending')])
    ).resolves.toBe('still-pending')
  })
})

describe('apiFetchJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    {
      body: { data: { ok: true } },
      expected: { ok: true },
    },
    {
      body: { ok: true },
      expected: { ok: true },
    },
  ])('parses successful JSON responses', async ({ body, expected }) => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 })
    )

    await expect(apiFetchJson('/api/test')).resolves.toEqual(expected)
  })

  it('throws ApiRequestError with structured API error fields', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'PYTRENDS_RATE_LIMIT',
            message: 'Too many requests',
            details: { retryAfter: 60 },
          },
        }),
        { status: 429 }
      )
    )

    await expect(apiFetchJson('/api/trends')).rejects.toMatchObject({
      name: 'ApiRequestError',
      message: 'Too many requests',
      status: 429,
      code: 'PYTRENDS_RATE_LIMIT',
      details: { retryAfter: 60 },
    } satisfies Partial<ApiRequestError>)
  })

  it('falls back to message or HTTP status for unstructured errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Bad request' }), { status: 400 })
    )
    await expect(apiFetchJson('/api/test')).rejects.toMatchObject({
      message: 'Bad request',
      status: 400,
      code: 'API_ERROR',
    })

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('not json', { status: 500 })
    )
    await expect(apiFetchJson('/api/test')).rejects.toMatchObject({
      message: 'HTTP 500',
      status: 500,
      code: 'API_ERROR',
    })
  })
})
