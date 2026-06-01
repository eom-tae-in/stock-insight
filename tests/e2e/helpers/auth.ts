import { expect, type Page, test } from '@playwright/test'

type E2ECredentials = {
  email: string | undefined
  password: string | undefined
  isConfigured: boolean
}

function createCredentials(
  email: string | undefined,
  password: string | undefined
): E2ECredentials {
  return {
    email,
    password,
    isConfigured: Boolean(email && password),
  }
}

export function getE2EUserCredentials() {
  return createCredentials(
    process.env.E2E_USER_EMAIL,
    process.env.E2E_USER_PASSWORD
  )
}

export function getE2EAdminCredentials() {
  return createCredentials(
    process.env.E2E_ADMIN_EMAIL,
    process.env.E2E_ADMIN_PASSWORD
  )
}

export function skipWhenE2EUserCredentialsMissing() {
  const { isConfigured } = getE2EUserCredentials()
  test.skip(
    !isConfigured,
    'E2E_USER_EMAIL and E2E_USER_PASSWORD are required for authenticated E2E tests.'
  )
}

export function skipWhenE2EAdminCredentialsMissing() {
  const { isConfigured } = getE2EAdminCredentials()
  test.skip(
    !isConfigured,
    'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required for admin E2E tests.'
  )
}

async function loginWithCredentials(
  page: Page,
  credentials: E2ECredentials,
  nextPath: string,
  roleLabel: string
) {
  const { email, password } = credentials
  if (!email || !password) {
    throw new Error(`${roleLabel} E2E credentials are not configured.`)
  }

  await test.step('로그인 페이지로 이동', async () => {
    await page.goto(`/login?next=${encodeURIComponent(nextPath)}`)
    await expect(
      page.getByRole('heading', { name: '환영합니다' })
    ).toBeVisible()
  })

  await test.step(`${roleLabel} E2E 테스트 계정으로 로그인`, async () => {
    await page.getByPlaceholder('이메일').fill(email)
    await page.getByPlaceholder('비밀번호').fill(password)
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await page.waitForURL(
      url => !url.pathname.startsWith('/login') && url.pathname === nextPath,
      { timeout: 15_000 }
    )
  })
}

export async function loginAsUser(page: Page, nextPath = '/') {
  await loginWithCredentials(
    page,
    getE2EUserCredentials(),
    nextPath,
    '일반 사용자'
  )
}

export async function loginAsAdmin(page: Page, nextPath = '/') {
  await loginWithCredentials(page, getE2EAdminCredentials(), nextPath, '관리자')
}
