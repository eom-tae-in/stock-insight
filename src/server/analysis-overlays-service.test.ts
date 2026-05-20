import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AnalysisOverlayServiceError,
  createAnalysisOverlayService,
} from './analysis-overlays-service'
import type { OverlayRepository } from './repositories/overlay-repository'
import { fetchCachedStockData } from './cached-stock-service'

const repository = {
  findOwnedAnalysisFilters: vi.fn(),
  findManyByAnalysisId: vi.fn(),
  create: vi.fn(),
  insertTimeseries: vi.fn(),
  updateOrder: vi.fn(),
  deleteById: vi.fn(),
  findTickerById: vi.fn(),
  refreshTimeseries: vi.fn(),
} satisfies OverlayRepository

vi.mock('./cached-stock-service', () => ({
  fetchCachedStockData: vi.fn(),
}))

const ownedAnalysis = {
  region: 'GLOBAL',
  period: '5Y',
  search_type: 'WEB',
} as const

describe('analysis-overlays-service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    repository.findOwnedAnalysisFilters.mockResolvedValue(ownedAnalysis)
  })

  describe('listAnalysisOverlays', () => {
    it('lists overlays after ownership validation', async () => {
      const service = createAnalysisOverlayService(repository)
      const overlays = [{ id: 'overlay-1', ticker: 'AAPL' }]
      repository.findManyByAnalysisId.mockResolvedValue(overlays as never)

      await expect(
        service.listAnalysisOverlays('user-1', 'analysis-1')
      ).resolves.toEqual(overlays)
      expect(repository.findOwnedAnalysisFilters).toHaveBeenCalledWith(
        'user-1',
        'analysis-1'
      )
      expect(repository.findManyByAnalysisId).toHaveBeenCalledWith(
        'user-1',
        'analysis-1'
      )
    })
  })

  describe('createAnalysisOverlay', () => {
    it('rejects when client filters do not match the saved analysis', async () => {
      const service = createAnalysisOverlayService(repository)

      await expect(
        service.createAnalysisOverlay('user-1', 'analysis-1', {
          ticker: 'AAPL',
          company_name: 'Apple Inc.',
          region: 'US',
          period: '5Y',
          search_type: 'WEB',
        })
      ).rejects.toMatchObject({
        code: 'FILTER_MISMATCH',
        status: 409,
      })
      expect(repository.create).not.toHaveBeenCalled()
    })

    it('rejects missing ticker or company name after ownership validation', async () => {
      const service = createAnalysisOverlayService(repository)

      await expect(
        service.createAnalysisOverlay('user-1', 'analysis-1', {
          ticker: '   ',
          company_name: 'Apple Inc.',
        })
      ).rejects.toMatchObject({
        code: 'INVALID_INPUT',
        status: 400,
      })
      expect(repository.findOwnedAnalysisFilters).toHaveBeenCalledWith(
        'user-1',
        'analysis-1'
      )
      expect(fetchCachedStockData).not.toHaveBeenCalled()
    })

    it.each([
      {
        name: 'normal price range',
        priceData: [
          { date: '2026-01-01', price: 100 },
          { date: '2026-01-08', price: 120 },
        ],
        expectedRecords: [
          {
            overlay_id: 'overlay-1',
            date: '2026-01-01',
            raw_price: 100,
            normalized_price: 0,
          },
          {
            overlay_id: 'overlay-1',
            date: '2026-01-08',
            raw_price: 120,
            normalized_price: 100,
          },
        ],
      },
      {
        name: 'flat price range',
        priceData: [
          { date: '2026-01-01', price: 100 },
          { date: '2026-01-08', price: 100 },
        ],
        expectedRecords: [
          {
            overlay_id: 'overlay-1',
            date: '2026-01-01',
            raw_price: 100,
            normalized_price: 50,
          },
          {
            overlay_id: 'overlay-1',
            date: '2026-01-08',
            raw_price: 100,
            normalized_price: 50,
          },
        ],
      },
    ])(
      'normalizes ticker and stores $name timeseries records',
      async ({ priceData, expectedRecords }) => {
        const service = createAnalysisOverlayService(repository)
        repository.create.mockResolvedValue('overlay-1')

        const result = await service.createAnalysisOverlay(
          'user-1',
          'analysis-1',
          {
            ticker: ' aapl ',
            company_name: ' Apple Inc. ',
            price_data: priceData,
          }
        )

        expect(result).toEqual({ id: 'overlay-1' })
        expect(repository.create).toHaveBeenCalledWith({
          analysisId: 'analysis-1',
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
          displayOrder: undefined,
        })
        expect(repository.insertTimeseries).toHaveBeenCalledWith(
          expectedRecords
        )
        expect(fetchCachedStockData).not.toHaveBeenCalled()
      }
    )

    it('fetches cached stock data when valid price data is not supplied', async () => {
      const service = createAnalysisOverlayService(repository)
      repository.create.mockResolvedValue('overlay-1')
      vi.mocked(fetchCachedStockData).mockResolvedValue({
        priceData: [
          {
            date: '2026-01-01',
            close: 100,
          },
          {
            date: '2026-01-08',
            close: 120,
          },
        ],
      } as never)

      await expect(
        service.createAnalysisOverlay('user-1', 'analysis-1', {
          ticker: 'AAPL',
          company_name: 'Apple Inc.',
        })
      ).resolves.toEqual({ id: 'overlay-1' })
      expect(fetchCachedStockData).toHaveBeenCalledWith('AAPL')
      expect(repository.insertTimeseries).toHaveBeenCalledWith([
        {
          overlay_id: 'overlay-1',
          date: '2026-01-01',
          raw_price: 100,
          normalized_price: 0,
        },
        {
          overlay_id: 'overlay-1',
          date: '2026-01-08',
          raw_price: 120,
          normalized_price: 100,
        },
      ])
    })

    it('rolls back the overlay when timeseries insertion fails', async () => {
      const service = createAnalysisOverlayService(repository)
      repository.create.mockResolvedValue('overlay-1')
      repository.insertTimeseries.mockRejectedValue(
        new Error('timeseries failed')
      )

      await expect(
        service.createAnalysisOverlay('user-1', 'analysis-1', {
          ticker: 'AAPL',
          company_name: 'Apple Inc.',
          price_data: [{ date: '2026-01-01', price: 100 }],
        })
      ).rejects.toThrow('timeseries failed')
      expect(repository.deleteById).toHaveBeenCalledWith(
        'analysis-1',
        'overlay-1'
      )
    })

    it('maps duplicate repository errors to service errors', async () => {
      const service = createAnalysisOverlayService(repository)
      repository.create.mockRejectedValue(new Error('DUPLICATE_OVERLAY'))

      await expect(
        service.createAnalysisOverlay('user-1', 'analysis-1', {
          ticker: 'AAPL',
          company_name: 'Apple Inc.',
          price_data: [{ date: '2026-01-01', price: 100 }],
        })
      ).rejects.toMatchObject({
        code: 'DUPLICATE',
        status: 409,
      })
    })
  })

  describe('updateAnalysisOverlayOrder', () => {
    it('rejects an empty overlays array', async () => {
      const service = createAnalysisOverlayService(repository)

      await expect(
        service.updateAnalysisOverlayOrder('user-1', 'analysis-1', [])
      ).rejects.toMatchObject({
        code: 'INVALID_INPUT',
        status: 400,
      })
    })

    it('updates each overlay display order after ownership validation', async () => {
      const service = createAnalysisOverlayService(repository)

      await expect(
        service.updateAnalysisOverlayOrder('user-1', 'analysis-1', [
          { id: 'overlay-2', display_order: 1 },
          { id: 'overlay-1', display_order: 2 },
        ])
      ).resolves.toEqual({ success: true })

      expect(repository.updateOrder).toHaveBeenCalledWith('analysis-1', [
        { id: 'overlay-2', display_order: 1 },
        { id: 'overlay-1', display_order: 2 },
      ])
    })

    it('rejects overlay entries without id or display order', async () => {
      const service = createAnalysisOverlayService(repository)

      await expect(
        service.updateAnalysisOverlayOrder('user-1', 'analysis-1', [
          { id: 'overlay-1' },
        ])
      ).rejects.toMatchObject({
        code: 'INVALID_INPUT',
        status: 400,
      })
      expect(repository.updateOrder).not.toHaveBeenCalled()
    })

    it('throws a service error when the analysis is not owned by the user', async () => {
      const service = createAnalysisOverlayService(repository)
      repository.findOwnedAnalysisFilters.mockResolvedValue(null)

      await expect(
        service.updateAnalysisOverlayOrder('user-1', 'analysis-1', [
          { id: 'overlay-1', display_order: 1 },
        ])
      ).rejects.toBeInstanceOf(AnalysisOverlayServiceError)
    })
  })

  describe('deleteAnalysisOverlay', () => {
    it('deletes an overlay after ownership validation', async () => {
      const service = createAnalysisOverlayService(repository)

      await expect(
        service.deleteAnalysisOverlay('user-1', 'analysis-1', 'overlay-1')
      ).resolves.toEqual({ success: true })
      expect(repository.deleteById).toHaveBeenCalledWith(
        'analysis-1',
        'overlay-1'
      )
    })
  })

  describe('refreshAnalysisOverlay', () => {
    it('rejects when the overlay cannot be found', async () => {
      const service = createAnalysisOverlayService(repository)
      repository.findTickerById.mockResolvedValue(null)

      await expect(
        service.refreshAnalysisOverlay('user-1', 'analysis-1', 'overlay-1')
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      })
      expect(fetchCachedStockData).not.toHaveBeenCalled()
    })

    it('refreshes overlay timeseries and returns the refreshed overlay', async () => {
      const service = createAnalysisOverlayService(repository)
      const refreshedOverlay = {
        id: 'overlay-1',
        ticker: 'AAPL',
      }
      repository.findTickerById.mockResolvedValue({ ticker: 'AAPL' } as never)
      vi.mocked(fetchCachedStockData).mockResolvedValue({
        priceData: [
          {
            date: '2026-01-01',
            close: 100,
          },
          {
            date: '2026-01-08',
            close: 120,
          },
        ],
      } as never)
      repository.findManyByAnalysisId.mockResolvedValue([
        refreshedOverlay,
      ] as never)

      await expect(
        service.refreshAnalysisOverlay('user-1', 'analysis-1', 'overlay-1')
      ).resolves.toEqual(refreshedOverlay)
      expect(repository.refreshTimeseries).toHaveBeenCalledWith({
        analysisId: 'analysis-1',
        overlayId: 'overlay-1',
        records: [
          {
            overlay_id: 'overlay-1',
            date: '2026-01-01',
            raw_price: 100,
            normalized_price: 0,
          },
          {
            overlay_id: 'overlay-1',
            date: '2026-01-08',
            raw_price: 120,
            normalized_price: 100,
          },
        ],
        pruneBeforeDate: '2026-01-01',
      })
    })

    it('throws when the refreshed overlay cannot be read back', async () => {
      const service = createAnalysisOverlayService(repository)
      repository.findTickerById.mockResolvedValue({ ticker: 'AAPL' } as never)
      vi.mocked(fetchCachedStockData).mockResolvedValue({
        priceData: [
          {
            date: '2026-01-01',
            close: 100,
          },
        ],
      } as never)
      repository.findManyByAnalysisId.mockResolvedValue([])

      await expect(
        service.refreshAnalysisOverlay('user-1', 'analysis-1', 'overlay-1')
      ).rejects.toMatchObject({
        code: 'REFRESH_FAILED',
        status: 500,
      })
    })
  })
})
