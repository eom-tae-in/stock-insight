import assert from 'node:assert/strict'
import { join } from 'node:path'
import { expect } from '@playwright/test'

export async function inspectCustomCharts(
  page,
  { origin, artifacts, width, theme }
) {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto(`${origin}/design-preview/custom-charts`)
  await page.evaluate(() => document.fonts.ready)
  const captures = []
  async function capture(state) {
    const path = join(artifacts, `${width}-${theme}-${state}.png`)
    await page.screenshot({ path, animations: 'disabled' })
    captures.push(path)
  }
  const trigger = page.getByRole('button', {
    name: '커스텀 차트 만들기',
    exact: true,
  })
  await capture('empty')
  await expect(trigger).toBeEnabled()
  const controls = await trigger.getAttribute('aria-controls')
  assert(controls, '차트 생성 버튼과 대화상자의 ID 연결이 필요합니다')
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  assert.equal(await dialog.getAttribute('id'), controls)
  await page.getByLabel('차트 이름', { exact: true }).fill('최근 1년 가격 추이')
  await page.getByRole('checkbox', { name: '13주 MA', exact: true }).check()
  assert(
    await page
      .getByRole('checkbox', { name: '52주 YoY', exact: true })
      .isDisabled()
  )
  assert.equal(
    await page.getByRole('spinbutton', { name: '주 수' }).inputValue(),
    '52'
  )
  await capture('modal')
  const geometry = await dialog.boundingBox()
  assert(geometry && geometry.x >= 0 && geometry.x + geometry.width <= width)
  await page.getByRole('radio', { name: '2년', exact: true }).click()
  await page.getByRole('checkbox', { name: '52주 YoY', exact: true }).check()
  await page.getByRole('radio', { name: '1년', exact: true }).click()
  assert.equal(
    await page.getByRole('status').innerText(),
    '기간이 줄어 선택을 해제했어요'
  )
  await capture('period-reduced')
  await page.getByRole('button', { name: '차트 만들기', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  await page.getByRole('button', { expanded: true }).waitFor()
  const saved = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('stock-custom-charts-ui-custom-chart') ?? '[]'
    )
  )
  assert.equal(saved.length, 1)
  assert.deepEqual(saved[0].series, ['close', 'ma13'])
  assert.equal(saved[0].timeRange, 52)
  await capture('saved')
  await page.reload()
  await page.getByRole('button', { expanded: true }).waitFor()
  await capture('reloaded')
  await page
    .getByRole('button', { name: '최근 1년 가격 추이 삭제', exact: true })
    .click()
  await page.getByRole('alertdialog').waitFor()
  await capture('delete-dialog')
  await page.getByRole('button', { name: '취소', exact: true }).click()
  await page.getByRole('alertdialog').waitFor({ state: 'hidden' })
  await page.getByRole('button', { expanded: true }).waitFor()
  assert.equal(await page.getByRole('button', { expanded: true }).count(), 1)
  await page
    .getByRole('button', { name: '최근 1년 가격 추이 삭제', exact: true })
    .click()
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await page.getByRole('alertdialog').waitFor({ state: 'hidden' })
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem('stock-custom-charts-ui-custom-chart')
    ),
    '[]'
  )
  await trigger.focus()
  await page.keyboard.press('Enter')
  await dialog.waitFor()
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  assert(await trigger.evaluate(element => element === document.activeElement))
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  )
  assert.equal(overflow, false)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await capture('end')
  assert.deepEqual(errors, [])
  return {
    width,
    theme,
    captures,
    errors,
    geometry,
    persistence: 'create/reload/delete/cancel/keyboard verified',
  }
}
