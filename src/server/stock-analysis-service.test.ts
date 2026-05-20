import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createStockAnalysisService,
  getStockAnalysisData,
} from './stock-analysis-service'
import { fetchCachedStockData } from '@/server/cached-stock-service'
import type { StockPriceRepository } from './repositories/stock-price-repository'
import type { StockSearchRepository } from './repositories/stock-search-repository'
import type { PriceDataPoint, SearchRecord } from '@/types/database'

vi.mock('@/server/cached-stock-service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/server/cached-stock-service')>()

  return {
    ...actual,
    fetchCachedStockData: vi.fn(),
  }
})

const searchRepository = {
  upsert: vi.fn(),
  findById: vi.fn(),
  findByTicker: vi.fn(),
  findManyByUserId: vi.fn(),
  findSuggestions: vi.fn(),
  update: vi.fn(),
  deleteById: vi.fn(),
} satisfies StockSearchRepository

const priceRepository = {
  findBySearchId: vi.fn(),
  upsertMany: vi.fn(),
  deleteBefore: vi.fn(),
} satisfies StockPriceRepository

const priceData: PriceDataPoint[] = Array.from({ length: 70 }, (_, index) => ({
  date: `2026-${String(index + 1).padStart(2, '0')}`,
  open: 90 + index,
  high: 110 + index,
  low: 80 + index,
  close: 100 + index,
  volume: 1000 + index,
}))

const existingSearch = {
  id: 'search-1',
  user_id: 'user-1',
  ticker: 'AAPL',
  company_name: 'Apple Inc.',
  currency: 'USD',
  price_data: priceData,
  searched_at: '2026-01-01T00:00:00.000Z',
} satisfies SearchRecord

describe('stock-analysis-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getStockAnalysisData', () => {
    it('returns null for blank ticker before fetching stock data', async () => {
      await expect(getStockAnalysisData('   ')).resolves.toBeNull()

      expect(fetchCachedStockData).not.toHaveBeenCalled()
    })

    it('normalizes ticker and maps cached stock data to analysis data', async () => {
      vi.mocked(fetchCachedStockData).mockResolvedValue({
        companyName: 'Apple Inc.',
        currentPrice: 169,
        previousClose: 168,
        currency: 'USD',
        priceData,
      })

      await expect(getStockAnalysisData(' aapl ')).resolves.toMatchObject({
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        currentPrice: 169,
        previousClose: 168,
        currency: 'USD',
        period: '5Y',
        interval: '1wk',
        priceData,
      })
      expect(fetchCachedStockData).toHaveBeenCalledWith('AAPL', '5Y', '1wk')
    })
  })

  describe('saveStockAnalysisAsSearch', () => {
    it.each([
      {
        name: 'blank ticker',
        input: {
          ticker: '   ',
          companyName: 'Apple Inc.',
          currency: 'USD',
          priceData,
        },
      },
      {
        name: 'empty price data',
        input: {
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
          currency: 'USD',
          priceData: [],
        },
      },
    ])('rejects $name before repository mutation', async ({ input }) => {
      const service = createStockAnalysisService(
        searchRepository,
        priceRepository
      )

      await expect(
        service.saveStockAnalysisAsSearch('user-1', input)
      ).rejects.toMatchObject({
        code: 'STOCK_DATA_NOT_FOUND',
        status: 404,
      })
      expect(searchRepository.findByTicker).not.toHaveBeenCalled()
      expect(searchRepository.upsert).not.toHaveBeenCalled()
    })

    it('rejects duplicate saved ticker before writing prices', async () => {
      const service = createStockAnalysisService(
        searchRepository,
        priceRepository
      )
      searchRepository.findByTicker.mockResolvedValue(existingSearch)

      await expect(
        service.saveStockAnalysisAsSearch('user-1', {
          ticker: 'aapl',
          companyName: 'Apple Inc.',
          currency: 'USD',
          priceData,
        })
      ).rejects.toMatchObject({
        code: 'ALREADY_SAVED',
        status: 409,
      })
      expect(searchRepository.findByTicker).toHaveBeenCalledWith(
        'user-1',
        'AAPL'
      )
      expect(priceRepository.upsertMany).not.toHaveBeenCalled()
    })

    it('saves normalized search metrics and price timeseries', async () => {
      const service = createStockAnalysisService(
        searchRepository,
        priceRepository
      )
      searchRepository.findByTicker.mockResolvedValue(null)
      searchRepository.upsert.mockResolvedValue('search-1')
      priceRepository.upsertMany.mockResolvedValue(undefined)

      await expect(
        service.saveStockAnalysisAsSearch('user-1', {
          ticker: ' aapl ',
          companyName: 'Apple Inc.',
          currency: 'USD',
          priceData,
        })
      ).resolves.toEqual({
        id: 'search-1',
        ticker: 'AAPL',
      })

      expect(searchRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: 'AAPL',
          user_id: 'user-1',
          company_name: 'Apple Inc.',
          currency: 'USD',
          weekly_open: priceData.at(-1)?.open,
          weekly_high: priceData.at(-1)?.high,
          weekly_low: priceData.at(-1)?.low,
          current_price: priceData.at(-1)?.close,
          previous_close: priceData.at(-2)?.close,
          price_data: priceData,
        })
      )
      expect(priceRepository.upsertMany).toHaveBeenCalledWith(
        'search-1',
        priceData
      )
    })

    it('rolls back the saved search when price timeseries save fails', async () => {
      const service = createStockAnalysisService(
        searchRepository,
        priceRepository
      )
      const error = new Error('price insert failed')
      searchRepository.findByTicker.mockResolvedValue(null)
      searchRepository.upsert.mockResolvedValue('search-1')
      priceRepository.upsertMany.mockRejectedValue(error)
      searchRepository.deleteById.mockResolvedValue(true)

      await expect(
        service.saveStockAnalysisAsSearch('user-1', {
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
          currency: 'USD',
          priceData,
        })
      ).rejects.toThrow(error)

      expect(searchRepository.deleteById).toHaveBeenCalledWith(
        'user-1',
        'search-1'
      )
    })
  })
})
