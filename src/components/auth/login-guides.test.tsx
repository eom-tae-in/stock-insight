import { render, screen } from '@testing-library/react'
import { it, expect, vi } from 'vitest'
import { OidcLogin } from './oidc-login'
vi.mock('@/components/shared/theme-toggle', () => ({ ThemeToggle: () => null }))
it('retains the OIDC login target and error while exposing public guide links', () => {
  render(<OidcLogin nextPath="/trends-jobs" failed />)
  expect(screen.getByRole('alert')).toHaveTextContent(
    '로그인을 완료하지 못했어요'
  )
  expect(screen.getByRole('link', { name: '계정으로 로그인' })).toHaveAttribute(
    'href',
    '/api/auth/oidc/login?next=%2Ftrends-jobs'
  )
  expect(
    screen.getByRole('link', { name: /사용법을 알아봐요/ })
  ).toHaveAttribute('href', '/guide')
  expect(
    screen.getByRole('link', { name: /새로워질 모습을 살펴봐요/ })
  ).toHaveAttribute('href', '/renewal')
})
