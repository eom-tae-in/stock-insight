import { expect, test } from '@playwright/test'
import { loginAsUser, skipWhenE2EUserCredentialsMissing } from './helpers/auth'
import { mockKeywordAnalysisApis } from './helpers/api-mocks'

test.describe('키워드 분석 흐름', () => {
  test.beforeEach(() => {
    skipWhenE2EUserCredentialsMissing()
  })

  test('인증 사용자는 내 키워드에서 새 키워드 검색을 시작할 수 있다', async ({
    page,
  }) => {
    await loginAsUser(page, '/keyword-analysis')

    await test.step('내 키워드 화면을 확인', async () => {
      await expect(
        page.getByRole('heading', { name: '내 키워드' })
      ).toBeVisible()
      await expect(
        page.getByText(
          '저장한 키워드의 검색 트렌드와 커스텀 비교 차트를 확인합니다.'
        )
      ).toBeVisible()
    })

    await test.step('새 키워드 검색 화면으로 이동', async () => {
      await page.getByRole('link', { name: '새 키워드 검색' }).click()

      await expect(page).toHaveURL(/\/keyword-analysis\/new$/)
      await expect(
        page.getByRole('heading', { name: '새 키워드 검색' })
      ).toBeVisible()
      await expect(page.getByText('키워드 검색', { exact: true })).toBeVisible()
    })

    await test.step('빈 키워드 조회 요청은 화면에서 막힌다', async () => {
      await page.getByRole('button', { name: '조회' }).click()

      await expect(page.getByText('키워드를 입력해주세요')).toBeVisible()
      await expect(page).toHaveURL(/\/keyword-analysis\/new$/)
    })
  })

  test('인증 사용자는 키워드 트렌드를 조회하고 저장할 수 있다', async ({
    page,
  }) => {
    await mockKeywordAnalysisApis(page)
    await loginAsUser(page, '/keyword-analysis/new')

    await test.step('키워드 검색 조건을 입력하고 조회', async () => {
      await page
        .getByPlaceholder('예: artificial intelligence, 전기차')
        .fill('AI')
      await page.getByRole('button', { name: '조회' }).click()

      await expect(page).toHaveURL(/\/keyword-analysis\/search\?/)
    })

    await test.step('트렌드 분석 결과를 확인', async () => {
      await expect(
        page.getByRole('heading', { name: '키워드 트렌드 분석' })
      ).toBeVisible()
      await expect(page.getByText('검색 키워드:')).toBeVisible()
      await expect(page.getByText('AI', { exact: true })).toBeVisible()
      await expect(
        page.getByText('13주 이동평균(13주 MA)').first()
      ).toBeVisible()
      await expect(page.getByText('5년 트렌드 분석')).toBeVisible()
    })

    await test.step('조회한 키워드를 저장하고 목록으로 돌아간다', async () => {
      await page.getByRole('button', { name: '키워드 저장' }).click()

      await expect(page).toHaveURL(/\/keyword-analysis$/)
      await expect(
        page.getByRole('heading', { name: '내 키워드' })
      ).toBeVisible()
    })
  })
})
