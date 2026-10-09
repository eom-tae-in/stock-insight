import assert from 'node:assert/strict'
import { join } from 'node:path'
import { expect } from '@playwright/test'

export async function inspectStockDetail(
  page,
  { origin, artifacts, width, theme }
) {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto(`${origin}/design-preview/stock-detail`)
  await expect(
    page.getByRole('heading', { name: 'NVDA', exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: '부족한 데이터 보기' })
  ).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  const region = page.getByRole('region', { name: '종목 핵심 지표' })
  await expect(region.getByText('13주 이동평균', { exact: true })).toBeVisible()
  await expect(region.getByText('주간 거래량', { exact: true })).toBeVisible()
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth
    ),
    false
  )
  const captures = []
  for (const state of ['complete', 'missing']) {
    if (state === 'missing') {
      await page.getByRole('button', { name: '부족한 데이터 보기' }).click()
      await expect(region.getByText('—', { exact: true }).first()).toBeVisible()
      await expect(region.getByText('주간 변동폭 —')).toBeVisible()
    }
    const path = join(artifacts, `${width}-${theme}-${state}.png`)
    await page.screenshot({ path, animations: 'disabled' })
    captures.push(path)
  }
  await region.getByRole('button', { name: '13주 이동평균 설명' }).focus()
  await expect(page.getByRole('tooltip')).toContainText('최근 13주')
  assert.deepEqual(errors, [])
  return { width, theme, captures, errors }
}
