import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStockSearchService } from './stock-search-service'
import type { StockSearchRepository } from './repositories/stock-search-repository'
import type { SearchRecord } from '@/types/database'

const repository = {
  upsert: vi.fn(),
  findById: vi.fn(),
  findByTicker: vi.fn(),
  findManyByUserId: vi.fn(),
  findSuggestions: vi.fn(),
  update: vi.fn(),
  deleteById: vi.fn(),
} satisfies StockSearchRepository

const searchRecord = {
  id: 'search-1',
  user_id: 'user-1',
  ticker: 'AAPL',
  company_name: 'Apple Inc.',
  currency: 'USD',
  price_data: [],
  searched_at: '2026-01-01T00:00:00.000Z',
} satisfies SearchRecord

describe('stock-search-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gets a saved search through the injected repository', async () => {
    const service = createStockSearchService(repository)
    repository.findById.mockResolvedValue(searchRecord)

    await expect(service.findById('user-1', 'search-1')).resolves.toEqual(
      searchRecord
    )
    expect(repository.findById).toHaveBeenCalledWith('user-1', 'search-1')
  })

  it('gets saved searches through the injected repository', async () => {
    const service = createStockSearchService(repository)
    repository.findManyByUserId.mockResolvedValue([searchRecord])

    await expect(service.findManyByUserId('user-1')).resolves.toEqual([
      searchRecord,
    ])
    expect(repository.findManyByUserId).toHaveBeenCalledWith('user-1')
  })

  it('gets stock suggestions through the injected repository', async () => {
    const service = createStockSearchService(repository)
    const suggestions = [{ ticker: 'AAPL', companyName: 'Apple Inc.' }]
    repository.findSuggestions.mockResolvedValue(suggestions)

    await expect(service.findSuggestions('app', 5)).resolves.toEqual(
      suggestions
    )
    expect(repository.findSuggestions).toHaveBeenCalledWith('app', 5)
  })

  it('deletes a saved search through the injected repository', async () => {
    const service = createStockSearchService(repository)
    repository.deleteById.mockResolvedValue(true)

    await expect(service.deleteById('user-1', 'search-1')).resolves.toBe(true)
    expect(repository.deleteById).toHaveBeenCalledWith('user-1', 'search-1')
  })
})
