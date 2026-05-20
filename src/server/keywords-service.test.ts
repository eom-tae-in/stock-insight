import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createKeywordService } from './keywords-service'
import type { KeywordRepository } from './repositories/keyword-repository'

const repository = {
  findManyByUserId: vi.fn(),
  findById: vi.fn(),
  upsert: vi.fn(),
  updateName: vi.fn(),
  reorder: vi.fn(),
  deleteById: vi.fn(),
} satisfies KeywordRepository

const keywordRecord = {
  id: 'keyword-1',
  user_id: 'user-1',
  keyword: 'AI chips',
  normalized_keyword: 'AI chips',
  region: 'GLOBAL',
  search_type: 'WEB',
  trends_data: [],
  searched_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  display_order: 2,
} as const

describe('keywords-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gets keywords through the injected repository', async () => {
    const service = createKeywordService(repository)
    repository.findManyByUserId.mockResolvedValue([keywordRecord])

    await expect(service.getKeywords('user-1')).resolves.toEqual([
      keywordRecord,
    ])
    expect(repository.findManyByUserId).toHaveBeenCalledWith('user-1')
  })

  it('gets a single keyword through the injected repository', async () => {
    const service = createKeywordService(repository)
    repository.findById.mockResolvedValue(keywordRecord)

    await expect(service.getKeyword('user-1', 'keyword-1')).resolves.toEqual(
      keywordRecord
    )
    expect(repository.findById).toHaveBeenCalledWith('user-1', 'keyword-1')
  })

  it('upserts a keyword through the injected repository', async () => {
    const service = createKeywordService(repository)
    repository.upsert.mockResolvedValue(keywordRecord)

    await expect(service.upsertKeyword('user-1', 'AI chips')).resolves.toEqual(
      keywordRecord
    )
    expect(repository.upsert).toHaveBeenCalledWith('user-1', 'AI chips')
  })

  it('updates a keyword through the injected repository', async () => {
    const service = createKeywordService(repository)
    repository.updateName.mockResolvedValue(keywordRecord)

    await expect(
      service.updateKeyword('user-1', 'keyword-1', 'AI chips')
    ).resolves.toEqual(keywordRecord)
    expect(repository.updateName).toHaveBeenCalledWith(
      'user-1',
      'keyword-1',
      'AI chips'
    )
  })

  it('reorders keywords through the injected repository', async () => {
    const service = createKeywordService(repository)
    repository.reorder.mockResolvedValue(undefined)

    await expect(
      service.reorderKeywords('user-1', ['keyword-2', 'keyword-1'])
    ).resolves.toBeUndefined()
    expect(repository.reorder).toHaveBeenCalledWith('user-1', [
      'keyword-2',
      'keyword-1',
    ])
  })

  it('deletes a keyword through the injected repository', async () => {
    const service = createKeywordService(repository)
    repository.deleteById.mockResolvedValue(true)

    await expect(service.deleteKeyword('user-1', 'keyword-1')).resolves.toBe(
      true
    )
    expect(repository.deleteById).toHaveBeenCalledWith('user-1', 'keyword-1')
  })
})
