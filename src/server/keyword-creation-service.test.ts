import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createKeywordCreationService } from './keyword-creation-service'
import type { AnalysisRepository } from './repositories/analysis-repository'
import type { KeywordRepository } from './repositories/keyword-repository'
import type { OverlayRepository } from './repositories/overlay-repository'

const keywordRepository = {
  findManyByUserId: vi.fn(),
  findById: vi.fn(),
  upsert: vi.fn(),
  updateName: vi.fn(),
  reorder: vi.fn(),
  deleteById: vi.fn(),
} satisfies KeywordRepository

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

describe('createKeywordCreationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    keywordRepository.upsert.mockResolvedValue({
      id: 'keyword-1',
      user_id: 'user-1',
      keyword: 'AI',
      region: 'GLOBAL',
      search_type: 'WEB',
      trends_data: [],
      searched_at: '2026-01-01T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    analysisRepository.create.mockResolvedValue('analysis-1')
    overlayRepository.create.mockResolvedValue('overlay-1')
  })

  it('creates a keyword with analysis data and stock overlays', async () => {
    const service = createKeywordCreationService(
      keywordRepository,
      analysisRepository,
      overlayRepository
    )

    const result = await service.createKeywordWithAnalysis('user-1', {
      keyword: 'AI',
      region: 'GLOBAL',
      search_type: 'WEB',
      chartData: [
        {
          date: '2026-01-01',
          trendsValue: 50,
          ma13Value: 48,
          yoyValue: 12,
        },
      ],
      overlays: [
        {
          ticker: 'aapl',
          companyName: 'Apple Inc.',
          overlayData: [
            {
              date: '2026-01-01',
              normalizedPrice: 70,
              rawPrice: 180,
            },
          ],
        },
      ],
    })

    expect(result).toEqual({ id: 'keyword-1', keyword: 'AI' })
    expect(keywordRepository.upsert).toHaveBeenCalledWith('user-1', 'AI')
    expect(analysisRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword_id: 'keyword-1',
        region: 'GLOBAL',
        period: '5Y',
        search_type: 'WEB',
        ma13_data: 48,
        yoy_data: 12,
      })
    )
    expect(overlayRepository.create).toHaveBeenCalledWith({
      analysisId: 'analysis-1',
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      displayOrder: 0,
    })
    expect(overlayRepository.insertTimeseries).toHaveBeenCalledWith([
      {
        overlay_id: 'overlay-1',
        date: '2026-01-01',
        normalized_price: 70,
        raw_price: 180,
      },
    ])
  })

  it('creates an empty analysis when only overlays are provided', async () => {
    const service = createKeywordCreationService(
      keywordRepository,
      analysisRepository,
      overlayRepository
    )

    await service.createKeywordWithAnalysis('user-1', {
      keyword: 'AI',
      overlays: [
        {
          ticker: 'MSFT',
          companyName: 'Microsoft',
          overlayData: [],
        },
      ],
    })

    expect(analysisRepository.create).toHaveBeenCalledWith({
      keyword_id: 'keyword-1',
      region: 'GLOBAL',
      period: '5Y',
      search_type: 'WEB',
      trends_data: [],
    })
    expect(overlayRepository.insertTimeseries).not.toHaveBeenCalled()
  })
})
