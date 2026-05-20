import { expect, test } from '@playwright/test'
import { loginWithE2EUser, skipWhenE2ECredentialsMissing } from './helpers/auth'
import { mockStockSearchSuggestions } from './helpers/api-mocks'

test.describe('종목 분석 흐름', () => {
  test.beforeEach(() => {
    skipWhenE2ECredentialsMissing()
  })

  test('인증 사용자는 내 종목에서 새 종목 조회를 시작할 수 있다', async ({
    page,
  }) => {
    await loginWithE2EUser(page, '/stock-analysis')

    await test.step('내 종목 화면을 확인', async () => {
      await expect(page.getByRole('heading', { name: '내 종목' })).toBeVisible()
      await expect(
        page.getByText('저장한 종목의 주간 지표와 분석 차트를 확인합니다.')
      ).toBeVisible()
    })

    await test.step('새 종목 조회 화면으로 이동', async () => {
      await page
        .getByRole('link', { name: /\+ 추가/ })
        .first()
        .click()

      await expect(page).toHaveURL(/\/search$/)
      await expect(
        page.getByRole('heading', { name: '새 종목 조회' })
      ).toBeVisible()
    })

    await test.step('빈 종목 조회 요청은 클라이언트 검증에서 막힌다', async () => {
      await page.getByRole('button', { name: '조회' }).click()

      await expect(
        page.getByText('종목 심볼 또는 회사명을 입력해주세요')
      ).toBeVisible()
      await expect(page).toHaveURL(/\/search$/)
    })
  })

  test('인증 사용자는 회사명 검색 결과에서 종목 후보를 확인할 수 있다', async ({
    page,
  }) => {
    await mockStockSearchSuggestions(page)
    await loginWithE2EUser(page, '/search')

    await test.step('회사명으로 종목을 검색', async () => {
      await page
        .getByPlaceholder('예: AAPL, TSLA, MSFT 또는 회사명...')
        .fill('Apple Inc')
      await page.getByRole('button', { name: '조회' }).click()
    })

    await test.step('검색 후보 목록을 확인', async () => {
      await expect(page.getByText('검색 결과')).toBeVisible()
      await expect(page.getByRole('button', { name: /AAPL/ })).toBeVisible()
      await expect(page.getByText('Apple Inc.')).toBeVisible()
      await expect(page.getByRole('button', { name: /MSFT/ })).toBeVisible()
      await expect(page.getByText('Microsoft Corporation')).toBeVisible()
    })
  })
})
