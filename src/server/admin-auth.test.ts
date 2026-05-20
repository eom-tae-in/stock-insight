import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminUser, isAdminEmail, validateAdminApiAuth } from './admin-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabase = {
  auth: {
    getUser: vi.fn(),
  },
} as unknown as SupabaseClient

describe('admin-auth', () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@test.com, owner@test.com'
  })

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalAdminEmails
  })

  it.each([
    { email: 'admin@test.com', expected: true },
    { email: ' ADMIN@test.com ', expected: true },
    { email: 'user@test.com', expected: false },
    { email: null, expected: false },
    { email: undefined, expected: false },
  ])('checks admin email %#', ({ email, expected }) => {
    expect(isAdminEmail(email)).toBe(expected)
  })

  it('returns the current user when the email is configured as admin', async () => {
    const user = { id: 'admin-1', email: 'admin@test.com' }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user },
      error: null,
    } as never)

    await expect(getAdminUser(supabase)).resolves.toEqual(user)
  })

  it('returns null when the current user is not an admin', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@test.com' } },
      error: null,
    } as never)

    await expect(getAdminUser(supabase)).resolves.toBeNull()
  })

  it('returns not found response for non-admin API auth', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as never)

    const result = await validateAdminApiAuth(supabase)

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(404)
  })
})
