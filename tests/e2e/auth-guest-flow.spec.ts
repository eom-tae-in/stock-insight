import { expect, test } from '@playwright/test'

test.describe('비로그인 인증 흐름', () => {
  for (const protectedPath of ['/stock-analysis', '/keyword-analysis']) {
    test(`미인증 사용자는 ${protectedPath} 접근 시 로그인 화면으로 이동한다`, async ({
      page,
    }) => {
      await page.goto(protectedPath)

      await expect(page).toHaveURL(
        new RegExp(`/login\\?next=${encodeURIComponent(protectedPath)}`)
      )
      await expect(
        page.getByRole('heading', { name: '환영합니다' })
      ).toBeVisible()
      await expect(
        page.getByText('로컬 주식 분석 도구에 로그인하세요')
      ).toBeVisible()
    })
  }

  test('로그인 화면에서 회원가입 화면으로 이동할 수 있다', async ({ page }) => {
    await page.goto('/login?next=/stock-analysis')

    await expect(
      page.getByRole('heading', { name: '환영합니다' })
    ).toBeVisible()
    await expect(page.getByPlaceholder('이메일')).toBeVisible()
    await expect(page.getByPlaceholder('비밀번호')).toBeVisible()

    await page.getByRole('link', { name: '회원가입' }).click()

    await expect(page).toHaveURL(/\/signup\?next=%2Fstock-analysis/)
    await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible()
    await expect(
      page.getByText('로컬 주식 분석 도구에 가입하세요')
    ).toBeVisible()
  })

  test('로그인 폼은 이메일과 비밀번호가 없으면 제출하지 않는다', async ({
    page,
  }) => {
    await page.goto('/login')

    await page.getByRole('button', { name: '로그인', exact: true }).click()

    await expect(page.getByText('이메일을 입력해주세요.')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('회원가입 폼은 잘못된 이메일 형식을 거부한다', async ({ page }) => {
    await page.goto('/signup')

    await page.getByPlaceholder('이메일').fill('not-an-email')
    await page.getByRole('button', { name: '인증 이메일 발송' }).click()

    await expect(page.getByText('유효한 이메일을 입력해주세요.')).toBeVisible()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
