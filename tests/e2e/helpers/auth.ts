import { expect, type Page, test } from '@playwright/test'

type E2ECredentials = {
  email: string | undefined
  password: string | undefined
  isConfigured: boolean
}

const LOGIN_FAILURE_MESSAGE_PATTERN =
  /이메일 또는 비밀번호가 올바르지 않습니다\.|로그인에 실패했습니다\.|오류가 발생했습니다\. 다시 시도해주세요\.|Invalid login credentials|Email not confirmed|Invalid email or password/i

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

function maskEmail(email: string | undefined) {
  if (!email) return '<missing>'

  const [name, domain] = email.split('@')
  if (!domain) return '<configured:invalid-email-format>'

  const visibleName = name.slice(0, 2)
  return `${visibleName}${'*'.repeat(Math.max(name.length - 2, 1))}@${domain}`
}

function logE2ECredentialState() {
  console.log('E2E_USER_EMAIL exists:', !!process.env.E2E_USER_EMAIL)
  console.log('E2E_USER_PASSWORD exists:', !!process.env.E2E_USER_PASSWORD)
  console.log('E2E_ADMIN_EMAIL exists:', !!process.env.E2E_ADMIN_EMAIL)
  console.log('E2E_ADMIN_PASSWORD exists:', !!process.env.E2E_ADMIN_PASSWORD)
}

async function getVisiblePageMessages(page: Page) {
  const messages = await page
    .locator('[data-sonner-toast], [role="alert"], [aria-live]')
    .evaluateAll(elements =>
      elements
        .map(element => element.textContent?.trim())
        .filter((text): text is string => Boolean(text))
    )

  return [...new Set(messages)]
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
  logE2ECredentialState()
  console.log(`[E2E auth] ${roleLabel} email: ${maskEmail(email)}`)
  console.log(`[E2E auth] ${roleLabel} password exists:`, !!password)

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

    console.log(`[E2E auth] ${roleLabel} URL after login click: ${page.url()}`)

    const loginFailureMessage = page
      .getByText(LOGIN_FAILURE_MESSAGE_PATTERN)
      .first()
    const navigationPromise = page
      .waitForURL(
        url => !url.pathname.startsWith('/login') && url.pathname === nextPath,
        { timeout: 15_000 }
      )
      .then(() => ({ status: 'navigated' as const }))
      .catch((error: unknown) => ({
        status: 'navigation-timeout' as const,
        error,
      }))
    const loginFailurePromise = loginFailureMessage
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => ({ status: 'login-failed' as const }))
      .catch(
        () =>
          new Promise<never>(() => {
            // Keep the failure detector from winning the race when no failure UI appears.
          })
      )

    const loginResult = await Promise.race([
      navigationPromise,
      loginFailurePromise,
    ])

    if (loginResult.status === 'navigation-timeout') {
      const messages = await getVisiblePageMessages(page)
      console.log(`[E2E auth] ${roleLabel} URL on login timeout: ${page.url()}`)
      console.log(
        `[E2E auth] ${roleLabel} visible page messages:`,
        messages.length > 0 ? messages : '<none>'
      )
      throw loginResult.error
    }

    if (loginResult.status === 'login-failed') {
      const messages = await getVisiblePageMessages(page)
      console.log(`[E2E auth] ${roleLabel} URL on login failure: ${page.url()}`)
      console.log(
        `[E2E auth] ${roleLabel} visible page messages:`,
        messages.length > 0 ? messages : '<none>'
      )
      throw new Error(
        `${roleLabel} E2E login failed before navigation. Check GitHub Actions secrets and the account authentication state.`
      )
    }

    console.log(`[E2E auth] ${roleLabel} URL after login: ${page.url()}`)
    await expect(page).toHaveURL(
      url => !url.pathname.startsWith('/login') && url.pathname === nextPath,
      { timeout: 5_000 }
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
