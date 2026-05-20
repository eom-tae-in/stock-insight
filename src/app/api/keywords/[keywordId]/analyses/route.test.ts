import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '@/app/api/keywords/[keywordId]/analyses/route'
import {
  AnalysisServiceError,
  createKeywordAnalysisForKeyword,
  getKeywordAnalysis,
  getKeywordAnalysesList,
} from '@/server/keyword-analyses-service'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/keyword-analyses-service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/server/keyword-analyses-service')>()

  return {
    AnalysisServiceError: actual.AnalysisServiceError,
    createKeywordAnalysisForKeyword: vi.fn(),
    getKeywordAnalysis: vi.fn(),
    getKeywordAnalysesList: vi.fn(),
  }
})

function authenticate(userId = 'user-1') {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
}

function request(url: string, body?: unknown) {
  return new NextRequest(url, {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : undefined,
  })
}

function params(keywordId = 'keyword-1') {
  return { params: Promise.resolve({ keywordId }) }
}

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean
    data?: unknown
    error?: { code: string; message: string }
  }>
}

describe('keyword analyses API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate()
  })

  it.each([
    {
      action: 'listing analyses',
      call: () =>
        GET(
          request('http://localhost/api/keywords/keyword-1/analyses'),
          params()
        ),
      service: getKeywordAnalysesList,
    },
    {
      action: 'reading a filtered analysis',
      call: () =>
        GET(
          request(
            'http://localhost/api/keywords/keyword-1/analyses?region=GLOBAL&searchType=WEB'
          ),
          params()
        ),
      service: getKeywordAnalysis,
    },
    {
      action: 'creating an analysis',
      call: () =>
        POST(
          request('http://localhost/api/keywords/keyword-1/analyses', {
            keyword: 'AI',
            region: 'GLOBAL',
            search_type: 'WEB',
          }),
          params()
        ),
      service: createKeywordAnalysisForKeyword,
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

  it('returns the saved analyses list when no filter query is supplied', async () => {
    const analyses = [
      {
        id: 'analysis-1',
        keyword_id: 'keyword-1',
        region: 'GLOBAL',
        period: '5Y',
        search_type: 'WEB',
      },
    ]
    vi.mocked(getKeywordAnalysesList).mockResolvedValue(analyses as never)

    const response = await GET(
      request('http://localhost/api/keywords/keyword-1/analyses'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: analyses,
    })
    expect(getKeywordAnalysesList).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'keyword-1'
    )
    expect(getKeywordAnalysis).not.toHaveBeenCalled()
  })

  it('returns a single analysis when region and search type are supplied', async () => {
    const analysis = {
      id: 'analysis-1',
      keyword_id: 'keyword-1',
      region: 'GLOBAL',
      period: '5Y',
      search_type: 'WEB',
    }
    vi.mocked(getKeywordAnalysis).mockResolvedValue(analysis as never)

    const response = await GET(
      request(
        'http://localhost/api/keywords/keyword-1/analyses?region=GLOBAL&searchType=WEB'
      ),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: analysis,
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

  it('creates a keyword analysis from the request body', async () => {
    const created = {
      id: 'analysis-1',
      trends_data: [],
    }
    vi.mocked(createKeywordAnalysisForKeyword).mockResolvedValue(
      created as never
    )

    const response = await POST(
      request('http://localhost/api/keywords/keyword-1/analyses', {
        keyword: 'AI',
        region: 'GLOBAL',
        search_type: 'WEB',
      }),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(201)
    expect(body).toMatchObject({
      success: true,
      data: created,
    })
    expect(createKeywordAnalysisForKeyword).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      'keyword-1',
      {
        keyword: 'AI',
        region: 'GLOBAL',
        search_type: 'WEB',
      }
    )
  })

  it('maps analysis service errors to API error responses', async () => {
    vi.mocked(createKeywordAnalysisForKeyword).mockRejectedValue(
      new AnalysisServiceError(
        'INVALID_INPUT',
        '분석 필터(region, search_type)는 필수입니다.',
        400
      )
    )

    const response = await POST(
      request('http://localhost/api/keywords/keyword-1/analyses', {
        keyword: 'AI',
      }),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: '분석 필터(region, search_type)는 필수입니다.',
      },
    })
  })

  it('maps unexpected analysis list failures to a 500 response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getKeywordAnalysesList).mockRejectedValue(
      new Error('database failed')
    )

    const response = await GET(
      request('http://localhost/api/keywords/keyword-1/analyses'),
      params()
    )
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'DB_ERROR',
        message: 'Analysis를 조회하지 못했습니다.',
      },
    })
  })
})
