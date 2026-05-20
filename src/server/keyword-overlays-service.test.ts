import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiServiceError,
  createKeywordOverlayService,
} from './keyword-overlays-service'
import { fetchCachedStockData } from '@/server/cached-stock-service'
import type { AnalysisRepository } from './repositories/analysis-repository'
import type { OverlayRepository } from './repositories/overlay-repository'
import type { KeywordAnalysisOverlay } from '@/types/database'

vi.mock('@/server/cached-stock-service', () => ({
  fetchCachedStockData: vi.fn(),
}))

const analysisRepository = {
  findByFilters: vi.fn(),
  findManyByKeywordId: vi.fn(),
  findOwnedById: vi.fn(),
  findOwnedWithKeyword: vi.fn(),
  getOwnedKeywordName: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteById: vi.fn(),
  reorder: vi.fn(),
} satisfies AnalysisRepository

const overlayRepository = {
  findOwnedAnalysisFilters: vi.fn(),
  findManyByAnalysisId: vi.fn(),
  create: vi.fn(),
  insertTimeseries: vi.fn(),
  updateOrder: vi.fn(),
  deleteById: vi.fn(),
  findTickerById: vi.fn(),
  refreshTimeseries: vi.fn(),
} satisfies OverlayRepository

const overlay = {
  id: 'overlay-1',
  analysis_id: 'analysis-1',
  ticker: 'AAPL',
  company_name: 'Apple Inc.',
  display_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  chart_data: [{ date: '2026-01-01', normalizedPrice: 50, rawPrice: 100 }],
} satisfies KeywordAnalysisOverlay

function ownKeywordWithDefaultAnalysis(analysisId = 'analysis-1') {
  analysisRepository.getOwnedKeywordName.mockResolvedValue('AI')
  analysisRepository.findByFilters.mockResolvedValue({
    id: analysisId,
    keyword_id: 'keyword-1',
    region: 'GLOBAL',
    period: '5Y',
    search_type: 'WEB',
    trends_data: [],
    created_at: '2026-01-01T00:00:00.000Z',
  })
}

describe('keyword-overlays-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing keyword id before repository lookup', async () => {
    const service = createKeywordOverlayService(
      analysisRepository,
      overlayRepository
    )

    await expect(
      service.listKeywordOverlays('user-1', '')
    ).rejects.toMatchObject({
      code: 'INVALID_ID',
      status: 400,
    })
    expect(analysisRepository.getOwnedKeywordName).not.toHaveBeenCalled()
  })

  it('creates a default analysis when listing overlays for a keyword without one', async () => {
    const service = createKeywordOverlayService(
      analysisRepository,
      overlayRepository
    )
    analysisRepository.getOwnedKeywordName.mockResolvedValue('AI')
    analysisRepository.findByFilters.mockResolvedValue(null)
    analysisRepository.create.mockResolvedValue('analysis-1')
    overlayRepository.findManyByAnalysisId.mockResolvedValue([overlay])

    await expect(
      service.listKeywordOverlays('user-1', 'keyword-1')
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'overlay-1',
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        displayOrder: 0,
      }),
    ])
    expect(analysisRepository.create).toHaveBeenCalledWith({
      keyword_id: 'keyword-1',
      region: 'GLOBAL',
      period: '5Y',
      search_type: 'WEB',
      trends_data: [],
    })
  })

  it('rejects when the keyword is not owned by the user', async () => {
    const service = createKeywordOverlayService(
      analysisRepository,
      overlayRepository
    )
    analysisRepository.getOwnedKeywordName.mockResolvedValue(null)

    await expect(
      service.listKeywordOverlays('user-1', 'keyword-1')
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })
  })

  it('creates an overlay with supplied price data and normalized timeseries', async () => {
    const service = createKeywordOverlayService(
      analysisRepository,
      overlayRepository
    )
    ownKeywordWithDefaultAnalysis()
    overlayRepository.create.mockResolvedValue('overlay-1')
    overlayRepository.findManyByAnalysisId.mockResolvedValue([overlay])

    await expect(
      service.createKeywordOverlay('user-1', 'keyword-1', {
        ticker: 'aapl',
        companyName: 'Apple Inc.',
        priceData: [
          { date: '2026-01-01', price: 100 },
          { date: '2026-01-08', price: 200 },
        ],
      })
    ).resolves.toMatchObject({
      id: 'overlay-1',
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      displayOrder: 0,
    })
    expect(overlayRepository.insertTimeseries).toHaveBeenCalledWith([
      {
        overlay_id: 'overlay-1',
        date: '2026-01-01',
        normalized_price: 0,
        raw_price: 100,
      },
      {
        overlay_id: 'overlay-1',
        date: '2026-01-08',
        normalized_price: 100,
        raw_price: 200,
      },
    ])
  })

  it('fetches stock data when overlay price data is omitted', async () => {
    const service = createKeywordOverlayService(
      analysisRepository,
      overlayRepository
    )
    ownKeywordWithDefaultAnalysis()
    overlayRepository.create.mockResolvedValue('overlay-1')
    overlayRepository.findManyByAnalysisId.mockResolvedValue([overlay])
    vi.mocked(fetchCachedStockData).mockResolvedValue({
      companyName: 'Apple Inc.',
      currentPrice: 200,
      previousClose: 100,
      currency: 'USD',
      priceData: [
        { date: '2026-01-01', close: 100 },
        { date: '2026-01-08', close: 100 },
      ],
    })

    await service.createKeywordOverlay('user-1', 'keyword-1', {
      ticker: 'AAPL',
    })

    expect(fetchCachedStockData).toHaveBeenCalledWith('AAPL')
    expect(overlayRepository.insertTimeseries).toHaveBeenCalledWith([
      {
        overlay_id: 'overlay-1',
        date: '2026-01-01',
        normalized_price: 50,
        raw_price: 100,
      },
      {
        overlay_id: 'overlay-1',
        date: '2026-01-08',
        normalized_price: 50,
        raw_price: 100,
      },
    ])
  })

  it('rejects overlay creation without ticker', async () => {
    const service = createKeywordOverlayService(
      analysisRepository,
      overlayRepository
    )
    ownKeywordWithDefaultAnalysis()

    await expect(
      service.createKeywordOverlay('user-1', 'keyword-1', {})
    ).rejects.toBeInstanceOf(ApiServiceError)
    expect(overlayRepository.create).not.toHaveBeenCalled()
  })

  it('rejects reorder entries that are not owned by the keyword analysis', async () => {
    const service = createKeywordOverlayService(
      analysisRepository,
      overlayRepository
    )
    ownKeywordWithDefaultAnalysis()
    overlayRepository.findManyByAnalysisId.mockResolvedValue([overlay])

    await expect(
      service.updateKeywordOverlayOrder('user-1', 'keyword-1', ['other'])
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })
  })

  it('updates overlay order and returns the reordered list', async () => {
    const service = createKeywordOverlayService(
      analysisRepository,
      overlayRepository
    )
    ownKeywordWithDefaultAnalysis()
    overlayRepository.findManyByAnalysisId.mockResolvedValue([overlay])

    await service.updateKeywordOverlayOrder('user-1', 'keyword-1', [
      'overlay-1',
    ])

    expect(overlayRepository.updateOrder).toHaveBeenCalledWith('analysis-1', [
      { id: 'overlay-1', display_order: 0 },
    ])
  })

  it('deletes an owned overlay', async () => {
    const service = createKeywordOverlayService(
      analysisRepository,
      overlayRepository
    )
    ownKeywordWithDefaultAnalysis()
    overlayRepository.findManyByAnalysisId.mockResolvedValue([overlay])
    overlayRepository.deleteById.mockResolvedValue(true)

    await expect(
      service.deleteKeywordOverlay('user-1', 'keyword-1', 'overlay-1')
    ).resolves.toEqual({ success: true })
  })

  it('maps failed overlay deletion to a service error', async () => {
    const service = createKeywordOverlayService(
      analysisRepository,
      overlayRepository
    )
    ownKeywordWithDefaultAnalysis()
    overlayRepository.findManyByAnalysisId.mockResolvedValue([overlay])
    overlayRepository.deleteById.mockResolvedValue(false)

    await expect(
      service.deleteKeywordOverlay('user-1', 'keyword-1', 'overlay-1')
    ).rejects.toMatchObject({
      code: 'DELETE_FAILED',
      status: 500,
    })
  })
})
