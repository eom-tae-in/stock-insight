import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHealthService } from './health-service'
import type { HealthRepository } from './repositories/health-repository'

const repository = {
  checkDatabase: vi.fn(),
} satisfies HealthRepository

describe('health-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('checks database health through the injected repository', async () => {
    const service = createHealthService(repository)
    repository.checkDatabase.mockResolvedValue(undefined)

    await expect(service.checkDatabase()).resolves.toBeUndefined()
    expect(repository.checkDatabase).toHaveBeenCalledTimes(1)
  })

  it('propagates database health failures', async () => {
    const service = createHealthService(repository)
    const error = new Error('db down')
    repository.checkDatabase.mockRejectedValue(error)

    await expect(service.checkDatabase()).rejects.toThrow(error)
  })
})
