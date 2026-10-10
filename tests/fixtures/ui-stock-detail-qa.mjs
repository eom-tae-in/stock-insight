import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect } from '@playwright/test'
import * as XLSX from 'xlsx'

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
  const rail = page.getByRole('complementary', {
    name: '종목 연결과 데이터 정보',
  })
  await expect(rail.getByText('연결 키워드')).toBeVisible()
  await expect(rail.getByText('캐시 사용 · 24시간')).toBeVisible()
  await expect(rail.getByText('전체 · 웹 검색').first()).toBeVisible()
  const contrast = await rail.getByText('Yahoo Finance').evaluate(element => {
    const card = element.closest('section')
    const channels = color =>
      color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
    const luminance = color =>
      channels(color)
        .map(value => {
          const channel = value / 255
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
        })
        .reduce(
          (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
          0
        )
    const text = luminance(getComputedStyle(element).color)
    const background = luminance(getComputedStyle(card).backgroundColor)
    return (
      (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05)
    )
  })
  assert(contrast >= 4.5, `Data information contrast ${contrast} is below 4.5`)
  await rail.getByRole('button', { name: '키워드와 비교하기' }).click()
  const chooser = page.getByRole('navigation', { name: '비교할 키워드' })
  await expect(chooser.getByRole('link')).toHaveCount(3)
  await expect(chooser.getByRole('link', { name: '클라우드' })).toHaveAttribute(
    'href',
    '/keywords/preview-keyword-2?preview=NVDA'
  )
  if (width === 390) await expect(page.getByRole('dialog')).toBeVisible()
  const chooserPath = join(artifacts, `${width}-${theme}-keyword-chooser.png`)
  await page.screenshot({ path: chooserPath, animations: 'disabled' })
  captures.push(chooserPath)
  await page.keyboard.press('Escape')
  await expect(chooser).not.toBeVisible()
  await expect(
    rail.getByRole('button', { name: '키워드와 비교하기' })
  ).toBeFocused()
  const weekly = page.getByRole('region', { name: '주간 데이터', exact: true })
  for (const state of ['complete', 'missing']) {
    if (state === 'missing') {
      await page.getByRole('button', { name: '부족한 데이터 보기' }).click()
      await expect(region.getByText('—', { exact: true }).first()).toBeVisible()
      await expect(region.getByText('주간 변동폭 —')).toBeVisible()
      await expect(rail.getByText(/아직 이 종목에 연결된/)).toBeVisible()
      await expect(rail.getByText(/캐시 사용/)).toHaveCount(0)
      await rail.getByRole('button', { name: '키워드와 비교하기' }).click()
      await expect(page.getByText(/먼저 키워드를 저장/)).toBeVisible()
      await page.keyboard.press('Escape')
    }
    const table = weekly.getByRole('table')
    await expect(table.getByRole('row')).toHaveCount(
      state === 'complete' ? 7 : 2
    )
    await expect(table.getByRole('columnheader')).toHaveCount(9)
    if (state === 'missing') {
      const cells = table.getByRole('row').nth(1).getByRole('cell')
      for (const index of [1, 2, 3, 5, 6, 7, 8]) {
        await expect(cells.nth(index)).toHaveText('—')
      }
    }
    const path = join(artifacts, `${width}-${theme}-${state}.png`)
    await page.screenshot({ path, animations: 'disabled', fullPage: true })
    captures.push(path)
    await weekly.scrollIntoViewIfNeeded()
    const weeklyPath = join(artifacts, `${width}-${theme}-weekly-${state}.png`)
    await page.screenshot({ path: weeklyPath, animations: 'disabled' })
    captures.push(weeklyPath)
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
  await page
    .getByRole('button', { name: '전체 데이터 보기', exact: true })
    .click()
  await expect(weekly.getByRole('row')).toHaveCount(7)
  await expect(weekly.locator('[data-change="down"]').first()).toBeVisible()
  await expect(weekly.getByRole('link', { name: '전체 보기' })).toHaveAttribute(
    'href',
    '/stock-analysis/preview-detail/table'
  )
  const scrollRegion = weekly.getByRole('region', { name: /가로로 스크롤/ })
  await scrollRegion.focus()
  if (width === 390) {
    await page.keyboard.press('ArrowRight')
    await expect
      .poll(() => scrollRegion.evaluate(element => element.scrollLeft))
      .toBeGreaterThan(0)
    await scrollRegion.evaluate(element => {
      element.scrollLeft = element.scrollWidth
    })
  }
  const scrolledPath = join(artifacts, `${width}-${theme}-weekly-scrolled.png`)
  await page.screenshot({ path: scrolledPath, animations: 'disabled' })
  captures.push(scrolledPath)
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth
    ),
    false
  )
  if (width === 390 && theme === 'light') {
    const downloading = page.waitForEvent('download', { timeout: 30000 })
    await weekly
      .getByRole('button', { name: '전체 주간 데이터를 Excel로 다운로드' })
      .click()
    const download = await downloading
    assert.match(download.suggestedFilename(), /^NVDA_Table_\d{8}\.xlsx$/)
    const output = join(artifacts, 'weekly-export.xlsx')
    await download.saveAs(output)
    const workbook = XLSX.read(await readFile(output), { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    assert.equal(rows.length, 81, 'Excel에는 저장된 80주 전체가 있어야 합니다')
    assert.equal(rows[0].length, 4, '기존 Excel의4열 계약을 유지해야 합니다')
    assert.equal(rows[1][0], '2025-03-24')
    assert.equal(rows[1][1], '$200.00')
    assert.equal(rows.at(-1)[1], '$121.00')
  }
  assert.deepEqual(errors, [])
  return { width, theme, captures, errors }
}
