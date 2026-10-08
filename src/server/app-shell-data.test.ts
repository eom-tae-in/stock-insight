import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAppShellData } from './app-shell-data'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSavedSearches: vi.fn(),
  getKeywords: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
  }),
}))
vi.mock('@/server/stock-search-service', () => ({
  getSavedSearches: mocks.getSavedSearches,
}))
vi.mock('@/server/keywords-service', () => ({ getKeywords: mocks.getKeywords }))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSavedSearches.mockResolvedValue([])
  mocks.getKeywords.mockResolvedValue([])
})

describe('앱 셸 조회의 사용자 경계', () => {
  it('세션이 없으면 저장 데이터 조회 전에 로그인을 요구한다', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(getAppShellData()).rejects.toThrow('REDIRECT:/login')
    expect(mocks.getSavedSearches).not.toHaveBeenCalled()
    expect(mocks.getKeywords).not.toHaveBeenCalled()
  })
  it('검증된 사용자 소유 데이터만 조회하고 메타데이터로 관리자 권한을 부여하지 않는다', async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'owner-1',
          email: 'member@example.test',
          user_metadata: { full_name: '사용자', admin: true },
        },
      },
      error: null,
    })
    const result = await getAppShellData()
    expect(mocks.getSavedSearches).toHaveBeenCalledWith(
      expect.anything(),
      'owner-1'
    )
    expect(mocks.getKeywords).toHaveBeenCalledWith(expect.anything(), 'owner-1')
    expect(result.profile).toEqual({
      name: '사용자',
      email: 'member@example.test',
    })
    expect(result.shell.isAdmin).toBe(false)
    expect(mocks.getSavedSearches).toHaveBeenCalledTimes(1)
    expect(mocks.getKeywords).toHaveBeenCalledTimes(1)
  })
  it('인증 오류가 있으면 사용자 객체가 있어도 데이터를 조회하지 않는다', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'owner-1' } },
      error: new Error('expired'),
    })
    await expect(getAppShellData()).rejects.toThrow('REDIRECT:/login')
    expect(mocks.getSavedSearches).not.toHaveBeenCalled()
  })
})
