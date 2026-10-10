import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
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
  await expect(
    page.getByRole('button', { name: '기간 직접 입력' })
  ).toBeEnabled()
  await expect(page.locator('.recharts-surface').first()).toBeVisible()
  const captures = []
  for (const state of ['complete', 'missing']) {
    if (state === 'missing') {
      await page.getByRole('button', { name: '부족한 데이터 보기' }).click()
      await expect(region.getByText('—', { exact: true }).first()).toBeVisible()
      await expect(region.getByText('주간 변동폭 —')).toBeVisible()
    }
    const path = join(artifacts, `${width}-${theme}-${state}.png`)
    await page.screenshot({ path, animations: 'disabled', fullPage: true })
    captures.push(path)
  }
  await region.getByRole('button', { name: '13주 이동평균 설명' }).focus()
  await expect(page.getByRole('tooltip', { name: /최근 13주/ })).toContainText(
    '최근 13주'
  )
  const group = page.getByRole('group', { name: '차트 시리즈' })
  const ma = group.getByRole('button', { name: '13주 MA', exact: true })
  const close = group.getByRole('button', { name: '종가', exact: true })
  const yoy = group.getByRole('button', {
    name: '13주 이동평균 기준 전년동기 대비 증감률(52주 YoY)',
    exact: true,
  })
  await page.getByRole('radio', { name: '1Y', exact: true }).click()
  await expect(close).toHaveAttribute('aria-pressed', 'true')
  await expect(ma).toHaveAttribute('aria-pressed', 'false')
  await expect(yoy).toBeDisabled()
  await page.getByRole('button', { name: '기간 직접 입력' }).click()
  await page.getByRole('spinbutton', { name: '표시할 주 수' }).fill('10')
  await expect(ma).toBeDisabled()
  const directPath = join(artifacts, `${width}-${theme}-direct-period.png`)
  await page.screenshot({
    path: directPath,
    animations: 'disabled',
    fullPage: true,
  })
  captures.push(directPath)
  await page.getByRole('button', { name: '완료', exact: true }).click()
  await page.getByRole('radio', { name: '2Y', exact: true }).click()
  await expect(ma).toBeEnabled()
  await expect(yoy).toBeEnabled()
  await ma.click()
  await yoy.click()
  await expect(ma).toHaveAttribute('aria-pressed', 'true')
  await expect(yoy).toHaveAttribute('aria-pressed', 'true')
  const seriesPath = join(artifacts, `${width}-${theme}-series-restored.png`)
  await page.screenshot({
    path: seriesPath,
    animations: 'disabled',
    fullPage: true,
  })
  captures.push(seriesPath)
  const surface = page.locator('.recharts-surface').first()
  const grid = page.locator('.recharts-cartesian-grid').first()
  const surfaceBox = await surface.boundingBox()
  const gridBox = await grid.boundingBox()
  assert(surfaceBox && gridBox)
  assert(
    gridBox.width / surfaceBox.width > 0.6,
    '가격 플롯이 화면 폭을 충분히 사용해야 합니다'
  )
  const lastPriceBox = await page
    .locator('[data-last-price-label]')
    .boundingBox()
  assert(lastPriceBox)
  assert(
    lastPriceBox.x >= gridBox.x &&
      lastPriceBox.x + lastPriceBox.width <= gridBox.x + gridBox.width &&
      lastPriceBox.y >= gridBox.y &&
      lastPriceBox.y + lastPriceBox.height <= gridBox.y + gridBox.height,
    '최근 가격 라벨은 축 숫자와 겹치거나 플롯 밖으로 잘리면 안 됩니다'
  )
  await page.mouse.move(
    gridBox.x + gridBox.width * 0.7,
    gridBox.y + gridBox.height * 0.5
  )
  await expect(
    page.getByRole('tooltip', { name: '주간 가격 상세', exact: true })
  ).toContainText(/W\d+/)
  const tooltipPath = join(artifacts, `${width}-${theme}-weekly-tooltip.png`)
  await page.screenshot({
    path: tooltipPath,
    animations: 'disabled',
    fullPage: true,
  })
  captures.push(tooltipPath)
  await page
    .getByRole('button', { name: '하락 데이터 보기', exact: true })
    .click()
  const downBars = page.locator(
    '.recharts-bar-rectangle path[fill="var(--down)"]'
  )
  await expect(downBars.first()).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: '52주 YoY 막대' })
      .getByText('0%', { exact: true })
  ).toBeVisible()
  const downPath = join(artifacts, `${width}-${theme}-negative-yoy.png`)
  await page.screenshot({
    path: downPath,
    animations: 'disabled',
    fullPage: true,
  })
  captures.push(downPath)
  const beforeScroll = await grid.boundingBox()
  await grid.scrollIntoViewIfNeeded()
  const negativeGridBox = await grid.boundingBox()
  assert(negativeGridBox)
  await writeFile(
    join(artifacts, `${width}-${theme}-plot-geometry.json`),
    JSON.stringify(
      { initial: gridBox, beforeScroll, negative: negativeGridBox },
      null,
      2
    )
  )
  await page.mouse.move(
    negativeGridBox.x + negativeGridBox.width * 0.93,
    negativeGridBox.y + negativeGridBox.height * 0.5
  )
  const downTooltip = page.getByRole('tooltip', {
    name: '주간 가격 상세',
    exact: true,
  })
  await expect(downTooltip.locator('[data-change="down"]')).toBeVisible()
  const downTooltipPath = join(
    artifacts,
    `${width}-${theme}-negative-tooltip.png`
  )
  await page.screenshot({
    path: downTooltipPath,
    animations: 'disabled',
    fullPage: true,
  })
  captures.push(downTooltipPath)
  if (width === 390 && theme === 'light') {
    const downloading = page.waitForEvent('download', { timeout: 30000 })
    await page
      .getByRole('button', { name: '통합 분석 차트를 PNG로 다운로드' })
      .click()
    const download = await downloading
    const output = join(artifacts, 'chart-export.png')
    await download.saveAs(output)
    const bytes = await readFile(output)
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  }
  assert.deepEqual(errors, [])
  return { width, theme, captures, errors }
}
