import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { isDesignPreviewPath } from '@/lib/design-preview'
import Page from './page'
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))
vi.mock('@/components/design-preview/shell-showcase', () => ({
  ShellShowcase: () => <main>미리보기</main>,
}))
afterEach(() => vi.unstubAllEnvs())
describe('앱 셸 미리보기 경계', () => {
  it('셸 경로만 정확하게 허용한다', () => {
    expect(isDesignPreviewPath('/design-preview/shell')).toBe(true)
  })
  it('운영 환경에서는 notFound로 종료한다', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => Page()).toThrow('NEXT_NOT_FOUND')
  })
  it('개발 환경에서는 컴포넌트를 렌더한다', () => {
    vi.stubEnv('NODE_ENV', 'development')
    render(<Page />)
    expect(screen.getByRole('main')).toBeVisible()
  })
  it.each([
    '/design-preview/components/extra',
    '/design-preview/shell/extra',
    '/design-preview/other',
    '/api/trends-jobs',
    '/trends-jobs',
  ])('다른 경로 %s는 미리보기 예외에 포함하지 않는다', path => {
    const result = isDesignPreviewPath(path)
    expect(result).toBe(false)
  })
})
