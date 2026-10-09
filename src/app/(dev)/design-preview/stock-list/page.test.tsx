import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDesignPreviewPath } from '@/lib/design-preview'
import Page from './page'

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))
vi.mock('@/components/design-preview/stock-list-showcase', () => ({
  StockListShowcase: () => null,
}))
afterEach(() => vi.unstubAllEnvs())
describe('종목 목록 미리보기 경계', () => {
  it('정확한 경로만 개발 예외로 구분한다', () => {
    expect(isDesignPreviewPath('/design-preview/stock-list')).toBe(true)
    expect(isDesignPreviewPath('/design-preview/stock-list/extra')).toBe(false)
  })
  it('운영 환경에서 미리보기를 차단한다', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => Page()).toThrow('NEXT_NOT_FOUND')
  })
})
