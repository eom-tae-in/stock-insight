import { expect, test } from '@playwright/test'
import { loginWithE2EUser, skipWhenE2ECredentialsMissing } from './helpers/auth'

test.describe('관리자 대시보드 흐름', () => {
  test.beforeEach(() => {
    skipWhenE2ECredentialsMissing()
  })

  test('관리자 테스트 계정은 운영 대시보드를 확인하고 새로고침할 수 있다', async ({
    page,
  }) => {
    await loginWithE2EUser(page, '/admin')

    await test.step('관리자 페이지로 이동', async () => {
      await expect(
        page.getByRole('heading', { name: '운영 대시보드' })
      ).toBeVisible()
    })

    await test.step('운영 상태와 주요 지표를 확인', async () => {
      const cardTitles = page.locator('[data-slot="card-title"]')

      await expect(cardTitles.filter({ hasText: /^Supabase$/ })).toBeVisible()
      await expect(cardTitles.filter({ hasText: /^Redis$/ })).toBeVisible()
      await expect(
        cardTitles.filter({ hasText: /^Yahoo Finance$/ })
      ).toBeVisible()
      await expect(cardTitles.filter({ hasText: /^사용자$/ })).toBeVisible()
      await expect(cardTitles.filter({ hasText: /^키워드$/ })).toBeVisible()
      await expect(cardTitles.filter({ hasText: /^분석 조건$/ })).toBeVisible()
      await expect(cardTitles.filter({ hasText: /^티커 연동$/ })).toBeVisible()
    })

    await test.step('대시보드를 새로고침할 수 있다', async () => {
      await page.getByRole('button', { name: '새로고침' }).click()
      await expect(page.getByRole('button', { name: '새로고침' })).toBeEnabled()
    })
  })
})
