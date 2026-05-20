import { expect, type Page, test } from '@playwright/test'

export function getE2ECredentials() {
  const email = process.env.E2E_USER_EMAIL
  const password = process.env.E2E_USER_PASSWORD

  return {
    email,
    password,
    isConfigured: Boolean(email && password),
  }
}

export function skipWhenE2ECredentialsMissing() {
  const { isConfigured } = getE2ECredentials()
  test.skip(
    !isConfigured,
    'E2E_USER_EMAIL and E2E_USER_PASSWORD are required for authenticated E2E tests.'
  )
}

export async function loginWithE2EUser(page: Page, nextPath = '/') {
  const { email, password } = getE2ECredentials()
  if (!email || !password) {
    throw new Error('E2E credentials are not configured.')
  }

  await test.step('로그인 페이지로 이동', async () => {
    await page.goto(`/login?next=${encodeURIComponent(nextPath)}`)
    await expect(
      page.getByRole('heading', { name: '환영합니다' })
    ).toBeVisible()
  })

  await test.step('E2E 테스트 계정으로 로그인', async () => {
    await page.getByPlaceholder('이메일').fill(email)
    await page.getByPlaceholder('비밀번호').fill(password)
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await page.waitForURL(
      url => !url.pathname.startsWith('/login') && url.pathname === nextPath,
      { timeout: 15_000 }
    )
  })
}
