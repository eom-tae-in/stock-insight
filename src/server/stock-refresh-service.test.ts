import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createStockRefreshService,
  StockRefreshServiceError,
} from './stock-refresh-service'
import { fetchCachedStockData } from '@/server/cached-stock-service'
import type { StockPriceRepository } from './repositories/stock-price-repository'
import type { StockSearchRepository } from './repositories/stock-search-repository'
import type { PriceDataPoint, SearchRecord } from '@/types/database'

vi.mock('@/server/cached-stock-service', () => ({
  fetchCachedStockData: vi.fn(),
}))

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

const oldPriceData: PriceDataPoint[] = [
  { date: '2026-01-01', open: 90, high: 110, low: 80, close: 100 },
]

const refreshedPriceData: PriceDataPoint[] = Array.from(
  { length: 70 },
  (_, index) => ({
    date: `2026-${String(index + 1).padStart(2, '0')}`,
    open: 100 + index,
    high: 120 + index,
    low: 90 + index,
    close: 110 + index,
  })
)

const existingSearch = {
  id: 'search-1',
  user_id: 'user-1',
  ticker: 'AAPL',
  company_name: 'Old Apple',
  currency: 'USD',
  price_data: oldPriceData,
  current_price: 100,
  previous_close: 90,
  ma13: 95,
  yoy_change: 5,
  searched_at: '2026-01-01T00:00:00.000Z',
  last_updated_at: '2026-01-01T00:00:00.000Z',
} satisfies SearchRecord

describe('stock-refresh-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects when the saved search is not owned by the user', async () => {
    const service = createStockRefreshService(searchRepository, priceRepository)
    searchRepository.findById.mockResolvedValue(null)

    await expect(
      service.refreshSavedSearch('user-1', 'missing-search')
    ).rejects.toBeInstanceOf(StockRefreshServiceError)
    await expect(
      service.refreshSavedSearch('user-1', 'missing-search')
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })
    expect(fetchCachedStockData).not.toHaveBeenCalled()
  })

  it('refreshes metrics, replaces price timeseries, and returns the saved record', async () => {
    const service = createStockRefreshService(searchRepository, priceRepository)
    const refreshedSearch = {
      ...existingSearch,
      company_name: 'Apple Inc.',
      price_data: refreshedPriceData,
    }
    searchRepository.findById
      .mockResolvedValueOnce(existingSearch)
      .mockResolvedValueOnce(refreshedSearch)
    searchRepository.update.mockResolvedValue(true)
    priceRepository.deleteBefore.mockResolvedValue(undefined)
    priceRepository.upsertMany.mockResolvedValue(undefined)
    vi.mocked(fetchCachedStockData).mockResolvedValue({
      companyName: 'Apple Inc.',
      currentPrice: 179,
      previousClose: 178,
      currency: 'USD',
      priceData: refreshedPriceData,
    })

    await expect(
      service.refreshSavedSearch('user-1', 'search-1')
    ).resolves.toEqual(refreshedSearch)

    expect(fetchCachedStockData).toHaveBeenCalledWith('AAPL')
    expect(searchRepository.update).toHaveBeenCalledWith(
      'user-1',
      'search-1',
      expect.objectContaining({
        company_name: 'Apple Inc.',
        currency: 'USD',
        weekly_open: refreshedPriceData.at(-1)?.open,
        weekly_high: refreshedPriceData.at(-1)?.high,
        weekly_low: refreshedPriceData.at(-1)?.low,
        current_price: refreshedPriceData.at(-1)?.close,
        previous_close: refreshedPriceData.at(-2)?.close,
      })
    )
    expect(priceRepository.deleteBefore).toHaveBeenCalledWith(
      'search-1',
      refreshedPriceData[0].date
    )
    expect(priceRepository.upsertMany).toHaveBeenCalledWith(
      'search-1',
      refreshedPriceData
    )
  })

  it('keeps existing currency when refreshed stock data has no currency', async () => {
    const service = createStockRefreshService(searchRepository, priceRepository)
    searchRepository.findById
      .mockResolvedValueOnce(existingSearch)
      .mockResolvedValueOnce(existingSearch)
    searchRepository.update.mockResolvedValue(true)
    vi.mocked(fetchCachedStockData).mockResolvedValue({
      companyName: 'Apple Inc.',
      currentPrice: 179,
      previousClose: 178,
      priceData: refreshedPriceData,
    })

    await service.refreshSavedSearch('user-1', 'search-1')

    expect(searchRepository.update).toHaveBeenCalledWith(
      'user-1',
      'search-1',
      expect.objectContaining({
        currency: 'USD',
      })
    )
  })

  it('does not prune old prices when refreshed price data is empty', async () => {
    const service = createStockRefreshService(searchRepository, priceRepository)
    searchRepository.findById
      .mockResolvedValueOnce(existingSearch)
      .mockResolvedValueOnce(existingSearch)
    searchRepository.update.mockResolvedValue(true)
    vi.mocked(fetchCachedStockData).mockResolvedValue({
      companyName: 'Apple Inc.',
      currentPrice: 0,
      previousClose: 0,
      currency: 'USD',
      priceData: [],
    })

    await service.refreshSavedSearch('user-1', 'search-1')

    expect(priceRepository.deleteBefore).not.toHaveBeenCalled()
    expect(priceRepository.upsertMany).toHaveBeenCalledWith('search-1', [])
  })

  it('maps missing refreshed record to a service error', async () => {
    const service = createStockRefreshService(searchRepository, priceRepository)
    searchRepository.findById
      .mockResolvedValueOnce(existingSearch)
      .mockResolvedValueOnce(null)
    searchRepository.update.mockResolvedValue(true)
    vi.mocked(fetchCachedStockData).mockResolvedValue({
      companyName: 'Apple Inc.',
      currentPrice: 179,
      previousClose: 178,
      currency: 'USD',
      priceData: refreshedPriceData,
    })

    await expect(
      service.refreshSavedSearch('user-1', 'search-1')
    ).rejects.toMatchObject({
      code: 'REFRESH_FAILED',
      status: 500,
    })
  })
})
