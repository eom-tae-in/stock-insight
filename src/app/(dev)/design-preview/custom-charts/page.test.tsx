import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { isDesignPreviewPath } from '@/lib/design-preview'
import Page from './page'
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))
vi.mock('@/components/design-preview/custom-charts-showcase', () => ({
  CustomChartsShowcase: () => <main>미리보기</main>,
}))
afterEach(() => vi.unstubAllEnvs())
describe('커스텀 차트 미리보기 경계', () => {
  it('정확한 경로만 개발 예외로 구분한다', () => {
    expect(isDesignPreviewPath('/design-preview/custom-charts')).toBe(true)
    expect(isDesignPreviewPath('/design-preview/custom-charts/extra')).toBe(
      false
    )
  })
  it('운영 환경에서 미리보기를 차단한다', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => Page()).toThrow('NEXT_NOT_FOUND')
  })
  it('개발 환경에서 실제 표현 컴포넌트를 렌더한다', () => {
    vi.stubEnv('NODE_ENV', 'development')
    render(<Page />)
    expect(screen.getByRole('main')).toBeVisible()
  })
})
