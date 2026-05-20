import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'
import { getSupabaseClient } from '@/lib/supabase'
import { checkDatabaseHealth } from '@/server/health-service'

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({ from: vi.fn() })),
}))

vi.mock('@/server/health-service', () => ({
  checkDatabaseHealth: vi.fn(),
}))

describe('health API route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ok when database health check succeeds', async () => {
    vi.mocked(checkDatabaseHealth).mockResolvedValue(undefined)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      status: 'ok',
      database: 'supabase',
    })
    expect(getSupabaseClient).toHaveBeenCalled()
    expect(checkDatabaseHealth).toHaveBeenCalled()
  })

  it('returns error when database health check fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(checkDatabaseHealth).mockRejectedValue(new Error('db down'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      status: 'error',
      error: 'db down',
    })
    expect(consoleError).toHaveBeenCalledWith(
      '[Health] Supabase connection failed: db down'
    )
    consoleError.mockRestore()
  })
})
