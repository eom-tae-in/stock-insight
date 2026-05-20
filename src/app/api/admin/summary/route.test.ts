import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { GET } from './route'
import { validateAdminApiAuth } from '@/server/admin-auth'
import { getAdminSummary } from '@/server/admin-service'

const supabaseMock = vi.hoisted(() => ({ auth: { getUser: vi.fn() } }))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/server/admin-auth', () => ({
  validateAdminApiAuth: vi.fn(),
}))

vi.mock('@/server/admin-service', () => ({
  getAdminSummary: vi.fn(),
}))

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean
    data?: unknown
    error?: { code: string; message: string }
  }>
}

describe('admin summary API route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(validateAdminApiAuth).mockResolvedValue({
      user: { id: 'admin-1' },
    } as never)
  })

  it('returns admin summary for an admin user', async () => {
    const summary = { generatedAt: '2026-01-01T00:00:00.000Z', metrics: [] }
    vi.mocked(getAdminSummary).mockResolvedValue(summary as never)

    const response = await GET()
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: summary,
    })
    expect(validateAdminApiAuth).toHaveBeenCalledWith(supabaseMock)
  })

  it('returns admin auth response before loading summary', async () => {
    vi.mocked(validateAdminApiAuth).mockResolvedValue(
      NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Not found' },
        },
        { status: 404 }
      ) as never
    )

    const response = await GET()
    const body = await readJson(response)

    expect(response.status).toBe(404)
    expect(body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
    expect(getAdminSummary).not.toHaveBeenCalled()
  })

  it('maps unexpected summary failures to fallback API errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    vi.mocked(getAdminSummary).mockRejectedValue(new Error('db down'))

    const response = await GET()
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'ADMIN_SUMMARY_FAILED',
        message: '관리자 요약을 불러오지 못했습니다.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith(
      '관리자 요약 조회 실패:',
      expect.any(Error)
    )
    consoleError.mockRestore()
  })
})
