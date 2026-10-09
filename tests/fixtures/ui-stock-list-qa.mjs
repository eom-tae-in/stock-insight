import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import { inspectStockEdit } from './ui-stock-edit-qa.mjs'

export async function inspectStockList(page, options) {
  const refreshes = []
  let releaseRefresh
  await page.route('**/api/searches/preview-stock-1/refreshes', async route => {
    assert.equal(route.request().method(), 'POST')
    refreshes.push(route.request().url())
    await new Promise(resolve => {
      releaseRefresh = resolve
    })
    await route.fulfill({ status: 200, json: {} })
  })
  const result = await inspectStockEdit(page, {
    ...options,
    previewPath: '/design-preview/stock-list',
    beforeEditing: async (page, capture) => {
      await expect(page.getByRole('table', { name: '관심 종목' })).toBeVisible()
      await expect(
        page.getByRole('link', { name: 'AAPL 상세 보기' })
      ).toHaveAttribute('href', '/stock-analysis/preview-stock-0')
      await expect(
        page.getByText('AI 반도체 외 1개', { exact: true })
      ).toHaveCount(1)
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth
        ),
        false
      )
      if (options.width >= 1280) {
        const tops = await page
          .getByRole('columnheader')
          .evaluateAll(elements =>
            elements.map(element => element.getBoundingClientRect().top)
          )
        assert.equal(
          Math.max(...tops) - Math.min(...tops) < 2,
          true,
          'headers must stay on one line'
        )
        await expect(
          page.getByRole('columnheader', { name: '1년 추이' })
        ).toHaveCount(options.width >= 1440 ? 1 : 0)
      }
      await expect(
        page.getByText('2주 이상 갱신 안 된 종목 1', { exact: true })
      ).toBeVisible()
      await page.getByRole('radio', { name: '하락 1', exact: true }).click()
      await expect(page.getByRole('heading', { level: 3 })).toHaveText(['MSFT'])
      await capture('down-filter')
      await page
        .getByRole('searchbox', { name: '티커·회사명으로 찾기' })
        .fill('apple')
      await expect(
        page.getByRole('heading', { name: '조건에 맞는 종목이 없어요.' })
      ).toBeVisible()
      await capture('no-results')
      await page.getByRole('button', { name: '필터 초기화' }).click()
      await page.getByRole('searchbox').fill('microsoft')
      await expect(page.getByRole('heading', { level: 3 })).toHaveText(['MSFT'])
      await capture('company-search')
      await page.getByRole('button', { name: '편집', exact: true }).click()
      await page.getByRole('menuitem', { name: '삭제', exact: true }).click()
      await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3)
      await page.getByRole('button', { name: '완료', exact: true }).click()
      await expect(page.getByRole('searchbox')).toHaveValue('')
      await page.getByRole('button', { name: 'MSFT 작업' }).click()
      await capture('row-menu')
      await page.getByRole('menuitem', { name: '최신화', exact: true }).click()
      await expect(
        page.getByRole('status', { name: 'MSFT 최신화 중' })
      ).toBeVisible()
      await capture('refreshing')
      assert(releaseRefresh)
      releaseRefresh()
      await expect(
        page.getByRole('status', { name: 'MSFT 최신화 중' })
      ).toHaveCount(0)
    },
  })
  assert.equal(refreshes.length, 1)
  await page.getByRole('button', { name: '편집', exact: true }).click()
  await page.getByRole('menuitem', { name: '삭제', exact: true }).click()
  await page.getByRole('checkbox', { name: '전체 선택' }).check()
  await page
    .getByRole('group', { name: '종목 삭제 편집' })
    .getByRole('button', { name: '삭제', exact: true })
    .click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '삭제', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: '저장한 종목이 없어요.' })
  ).toBeVisible()
  await page.screenshot({
    path: `${options.artifacts}/${options.width}-${options.theme}-empty.png`,
    animations: 'disabled',
  })
  return {
    ...result,
    refreshes: refreshes.length,
    empty: 'last records deleted',
  }
}
