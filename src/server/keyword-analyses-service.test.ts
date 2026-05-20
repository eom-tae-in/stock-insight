import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AnalysisServiceError,
  createAnalysisService,
} from './keyword-analyses-service'
import type { AnalysisRepository } from './repositories/analysis-repository'
import {
  buildTrendsDataWithIndicators,
  fetchInternalTrendsData,
  TrendsProviderError,
} from '@/server/trends-internal-service'

const repository = {
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

vi.mock('@/server/trends-internal-service', () => {
  class MockTrendsProviderError extends Error {
    constructor(
      public code: string,
      message: string,
      public type: 'RATE_LIMIT' | 'NO_DATA' = 'NO_DATA',
      public status: number = 502
    ) {
      super(message)
    }
  }

  return {
    TrendsProviderError: MockTrendsProviderError,
    buildTrendsDataWithIndicators: vi.fn(),
    fetchInternalTrendsData: vi.fn(),
  }
})

describe('keyword-analyses-service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getKeywordAnalysis', () => {
    it('rejects missing keyword id before repository lookup', async () => {
      const service = createAnalysisService(repository)

      await expect(
        service.getKeywordAnalysis('user-1', '')
      ).rejects.toMatchObject({
        code: 'INVALID_REQUEST',
        status: 400,
      })
      expect(repository.findByFilters).not.toHaveBeenCalled()
    })

    it('uses default filters when optional filters are omitted', async () => {
      const service = createAnalysisService(repository)
      repository.findByFilters.mockResolvedValue({
        id: 'analysis-1',
      } as never)

      await service.getKeywordAnalysis('user-1', 'keyword-1')

      expect(repository.findByFilters).toHaveBeenCalledWith(
        'user-1',
        'keyword-1',
        'GLOBAL',
        '5Y',
        'WEB'
      )
    })
  })

  describe('getKeywordAnalysesList', () => {
    it('rejects missing keyword id before repository lookup', async () => {
      const service = createAnalysisService(repository)

      await expect(
        service.getKeywordAnalysesList('user-1', '')
      ).rejects.toMatchObject({
        code: 'INVALID_REQUEST',
        status: 400,
      })
      expect(repository.findManyByKeywordId).not.toHaveBeenCalled()
    })

    it('returns only 5Y analyses for the keyword', async () => {
      const service = createAnalysisService(repository)
      repository.findManyByKeywordId.mockResolvedValue([
        { id: 'analysis-1', period: '5Y' },
        { id: 'analysis-2', period: '1Y' },
      ] as never)

      await expect(
        service.getKeywordAnalysesList('user-1', 'keyword-1')
      ).resolves.toEqual([{ id: 'analysis-1', period: '5Y' }])
      expect(repository.findManyByKeywordId).toHaveBeenCalledWith(
        'user-1',
        'keyword-1'
      )
    })
  })

  describe('createKeywordAnalysisForKeyword', () => {
    it('rejects missing keyword id before repository lookup', async () => {
      const service = createAnalysisService(repository)

      await expect(
        service.createKeywordAnalysisForKeyword('user-1', '', {
          keyword: 'AI',
          region: 'GLOBAL',
          search_type: 'WEB',
        })
      ).rejects.toMatchObject({
        code: 'INVALID_INPUT',
        status: 400,
      })
      expect(repository.getOwnedKeywordName).not.toHaveBeenCalled()
      expect(fetchInternalTrendsData).not.toHaveBeenCalled()
    })

    it('rejects missing analysis filters before fetching trends data', async () => {
      const service = createAnalysisService(repository)

      await expect(
        service.createKeywordAnalysisForKeyword('user-1', 'keyword-1', {
          keyword: 'AI',
        })
      ).rejects.toMatchObject({
        code: 'INVALID_INPUT',
        status: 400,
      })
      expect(fetchInternalTrendsData).not.toHaveBeenCalled()
      expect(repository.create).not.toHaveBeenCalled()
    })

    it('loads the owned keyword name when keyword text is omitted', async () => {
      const service = createAnalysisService(repository)
      const trendsData = [
        {
          date: '2026-01-01',
          value: 50,
          ma13Value: null,
          yoyValue: null,
        },
      ]
      repository.getOwnedKeywordName.mockResolvedValue('AI chips')
      vi.mocked(fetchInternalTrendsData).mockResolvedValue([
        {
          date: '2026-01-01',
          value: 50,
        },
      ])
      vi.mocked(buildTrendsDataWithIndicators).mockReturnValue(trendsData)
      repository.create.mockResolvedValue('analysis-1')

      await expect(
        service.createKeywordAnalysisForKeyword('user-1', 'keyword-1', {
          region: 'GLOBAL',
          search_type: 'WEB',
        })
      ).resolves.toEqual({
        id: 'analysis-1',
        trends_data: trendsData,
      })
      expect(repository.getOwnedKeywordName).toHaveBeenCalledWith(
        'user-1',
        'keyword-1'
      )
      expect(fetchInternalTrendsData).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'AI chips',
        })
      )
    })

    it('rejects when the keyword does not belong to the user', async () => {
      const service = createAnalysisService(repository)
      repository.getOwnedKeywordName.mockResolvedValue(null)

      await expect(
        service.createKeywordAnalysisForKeyword('user-1', 'keyword-1', {
          region: 'GLOBAL',
          search_type: 'WEB',
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      })
      expect(fetchInternalTrendsData).not.toHaveBeenCalled()
    })

    it('fetches trends data, calculates indicators, and creates an analysis', async () => {
      const service = createAnalysisService(repository)
      const rawTrendsData = [
        {
          date: '2026-01-01',
          value: 50,
        },
      ]
      const trendsData = [
        {
          date: '2026-01-01',
          value: 50,
          ma13Value: 48,
          yoyValue: 12,
        },
      ]
      vi.mocked(fetchInternalTrendsData).mockResolvedValue(rawTrendsData)
      vi.mocked(buildTrendsDataWithIndicators).mockReturnValue(trendsData)
      repository.create.mockResolvedValue('analysis-1')

      const result = await service.createKeywordAnalysisForKeyword(
        'user-1',
        'keyword-1',
        {
          keyword: 'AI',
          region: 'GLOBAL',
          search_type: 'WEB',
        }
      )

      expect(result).toEqual({
        id: 'analysis-1',
        trends_data: trendsData,
      })
      expect(fetchInternalTrendsData).toHaveBeenCalledWith({
        keyword: 'AI',
        geo: '',
        timeframe: 'today 5-y',
        gprop: '',
      })
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword_id: 'keyword-1',
          region: 'GLOBAL',
          period: '5Y',
          search_type: 'WEB',
          trends_data: trendsData,
          ma13_data: 48,
          yoy_data: 12,
        })
      )
    })

    it('maps trends provider errors to analysis service errors', async () => {
      const service = createAnalysisService(repository)
      vi.mocked(fetchInternalTrendsData).mockRejectedValue(
        new TrendsProviderError(
          'TRENDS_RATE_LIMITED',
          'rate limited',
          'RATE_LIMIT',
          429
        )
      )

      await expect(
        service.createKeywordAnalysisForKeyword('user-1', 'keyword-1', {
          keyword: 'AI',
          region: 'GLOBAL',
          search_type: 'WEB',
        })
      ).rejects.toBeInstanceOf(AnalysisServiceError)
      await expect(
        service.createKeywordAnalysisForKeyword('user-1', 'keyword-1', {
          keyword: 'AI',
          region: 'GLOBAL',
          search_type: 'WEB',
        })
      ).rejects.toMatchObject({
        code: 'TRENDS_RATE_LIMITED',
        status: 429,
      })
    })

    it('maps unknown trends failures to a generic fetch error', async () => {
      const service = createAnalysisService(repository)
      vi.mocked(fetchInternalTrendsData).mockRejectedValue(
        new Error('network failed')
      )

      await expect(
        service.createKeywordAnalysisForKeyword('user-1', 'keyword-1', {
          keyword: 'AI',
          region: 'GLOBAL',
          search_type: 'WEB',
        })
      ).rejects.toMatchObject({
        code: 'TRENDS_FETCH_FAILED',
        status: 502,
      })
    })
  })

  describe('refreshKeywordAnalysis', () => {
    it('rejects when the analysis is not owned by the user', async () => {
      const service = createAnalysisService(repository)
      repository.findOwnedWithKeyword.mockResolvedValue(null)

      await expect(
        service.refreshKeywordAnalysis('user-1', 'analysis-1')
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      })
      expect(fetchInternalTrendsData).not.toHaveBeenCalled()
    })

    it('refreshes trends data and returns the saved analysis', async () => {
      const service = createAnalysisService(repository)
      const refreshed = {
        id: 'analysis-1',
        trends_data: [],
      }
      repository.findOwnedWithKeyword.mockResolvedValue({
        keyword: 'AI',
        analysis: {
          region: 'GLOBAL',
          period: '5Y',
          search_type: 'WEB',
        },
      } as never)
      vi.mocked(fetchInternalTrendsData).mockResolvedValue([
        {
          date: '2026-01-01',
          value: 50,
        },
      ])
      vi.mocked(buildTrendsDataWithIndicators).mockReturnValue([
        {
          date: '2026-01-01',
          value: 50,
          ma13Value: 48,
          yoyValue: 12,
        },
      ])
      repository.findOwnedById.mockResolvedValue(refreshed as never)

      await expect(
        service.refreshKeywordAnalysis('user-1', 'analysis-1')
      ).resolves.toEqual(refreshed)
      expect(repository.update).toHaveBeenCalledWith('analysis-1', {
        trends_data: [
          {
            date: '2026-01-01',
            value: 50,
            ma13Value: 48,
            yoyValue: 12,
          },
        ],
        ma13_data: 48,
        yoy_data: 12,
      })
    })

    it('maps missing refreshed record to a service error', async () => {
      const service = createAnalysisService(repository)
      repository.findOwnedWithKeyword.mockResolvedValue({
        keyword: 'AI',
        analysis: {
          region: 'GLOBAL',
          period: '5Y',
          search_type: 'WEB',
        },
      } as never)
      vi.mocked(fetchInternalTrendsData).mockResolvedValue([
        {
          date: '2026-01-01',
          value: 50,
        },
      ])
      vi.mocked(buildTrendsDataWithIndicators).mockReturnValue([])
      repository.findOwnedById.mockResolvedValue(null)

      await expect(
        service.refreshKeywordAnalysis('user-1', 'analysis-1')
      ).rejects.toMatchObject({
        code: 'REFRESH_FAILED',
        status: 500,
      })
    })

    it('maps trends provider errors during refresh', async () => {
      const service = createAnalysisService(repository)
      repository.findOwnedWithKeyword.mockResolvedValue({
        keyword: 'AI',
        analysis: {
          region: 'GLOBAL',
          period: '5Y',
          search_type: 'WEB',
        },
      } as never)
      vi.mocked(fetchInternalTrendsData).mockRejectedValue(
        new TrendsProviderError(
          'TRENDS_RATE_LIMITED',
          'rate limited',
          'RATE_LIMIT',
          429
        )
      )

      await expect(
        service.refreshKeywordAnalysis('user-1', 'analysis-1')
      ).rejects.toMatchObject({
        code: 'TRENDS_RATE_LIMITED',
        status: 429,
      })
    })

    it('maps unknown refresh failures to a generic refresh error', async () => {
      const service = createAnalysisService(repository)
      repository.findOwnedWithKeyword.mockResolvedValue({
        keyword: 'AI',
        analysis: {
          region: 'GLOBAL',
          period: '5Y',
          search_type: 'WEB',
        },
      } as never)
      vi.mocked(fetchInternalTrendsData).mockRejectedValue(
        new Error('network failed')
      )

      await expect(
        service.refreshKeywordAnalysis('user-1', 'analysis-1')
      ).rejects.toMatchObject({
        code: 'TRENDS_REFRESH_FAILED',
        status: 502,
      })
    })
  })

  describe('owned analysis mutations', () => {
    it('returns the owned analysis directly from the repository', async () => {
      const service = createAnalysisService(repository)
      const analysis = { id: 'analysis-1' }
      repository.findOwnedById.mockResolvedValue(analysis as never)

      await expect(
        service.getOwnedAnalysis('user-1', 'analysis-1')
      ).resolves.toEqual(analysis)
    })

    it.each([
      {
        action: 'update',
        run: () =>
          createAnalysisService(repository).updateOwnedAnalysis(
            'user-1',
            'analysis-1',
            { ma13_data: 10 }
          ),
      },
      {
        action: 'delete',
        run: () =>
          createAnalysisService(repository).deleteOwnedAnalysis(
            'user-1',
            'analysis-1'
          ),
      },
    ])('rejects $action when the analysis is not owned', async ({ run }) => {
      repository.findOwnedById.mockResolvedValue(null)

      await expect(run()).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      })
    })

    it('updates an owned analysis', async () => {
      const service = createAnalysisService(repository)
      repository.findOwnedById.mockResolvedValue({ id: 'analysis-1' } as never)

      await expect(
        service.updateOwnedAnalysis('user-1', 'analysis-1', {
          ma13_data: 10,
        })
      ).resolves.toEqual({ success: true })
      expect(repository.update).toHaveBeenCalledWith('analysis-1', {
        ma13_data: 10,
      })
    })

    it('deletes an owned analysis', async () => {
      const service = createAnalysisService(repository)
      repository.findOwnedById.mockResolvedValue({ id: 'analysis-1' } as never)

      await expect(
        service.deleteOwnedAnalysis('user-1', 'analysis-1')
      ).resolves.toEqual({ success: true })
      expect(repository.deleteById).toHaveBeenCalledWith('analysis-1')
    })

    it('rejects invalid reorder input before repository mutation', async () => {
      const service = createAnalysisService(repository)

      await expect(
        service.reorderOwnedAnalyses('user-1', [])
      ).rejects.toMatchObject({
        code: 'INVALID_ORDER',
        status: 400,
      })
      expect(repository.reorder).not.toHaveBeenCalled()
    })

    it.each([
      {
        repositoryError: 'DUPLICATE_ANALYSIS_ID',
        expectedCode: 'DUPLICATE_ANALYSIS_ID',
        expectedStatus: 400,
      },
      {
        repositoryError: 'ANALYSIS_OWNERSHIP_MISMATCH',
        expectedCode: 'ANALYSIS_OWNERSHIP_MISMATCH',
        expectedStatus: 403,
      },
    ])(
      'maps $repositoryError from repository reorder',
      async ({ repositoryError, expectedCode, expectedStatus }) => {
        const service = createAnalysisService(repository)
        repository.reorder.mockRejectedValue(new Error(repositoryError))

        await expect(
          service.reorderOwnedAnalyses('user-1', ['analysis-1'])
        ).rejects.toMatchObject({
          code: expectedCode,
          status: expectedStatus,
        })
      }
    )

    it('reorders owned analyses', async () => {
      const service = createAnalysisService(repository)

      await expect(
        service.reorderOwnedAnalyses('user-1', ['analysis-2', 'analysis-1'])
      ).resolves.toEqual({ success: true })
      expect(repository.reorder).toHaveBeenCalledWith('user-1', [
        'analysis-2',
        'analysis-1',
      ])
    })

    it('rethrows unexpected repository reorder errors', async () => {
      const service = createAnalysisService(repository)
      const unexpectedError = new Error('database unavailable')
      repository.reorder.mockRejectedValue(unexpectedError)

      await expect(
        service.reorderOwnedAnalyses('user-1', ['analysis-1'])
      ).rejects.toBe(unexpectedError)
    })
  })
})
