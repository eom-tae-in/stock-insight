import assert from 'node:assert/strict'
import { join } from 'node:path'
import { expect } from '@playwright/test'

export async function inspectStockEdit(
  page,
  {
    origin,
    artifacts,
    width,
    theme,
    previewPath = '/design-preview/stock-edit',
    beforeEditing,
  }
) {
  const errors = []
  const deleted = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.route('**/api/searches/preview-stock-*', async route => {
    assert.equal(route.request().method(), 'DELETE')
    deleted.push(new URL(route.request().url()).pathname)
    await route.fulfill({ status: 204 })
  })
  await page.goto(`${origin}${previewPath}`)
  await page.evaluate(() => document.fonts.ready)
  const captures = []
  async function capture(state) {
    const path = join(artifacts, `${width}-${theme}-${state}.png`)
    await page.screenshot({ path, animations: 'disabled' })
    captures.push(path)
  }
  async function edit(mode) {
    await page.getByRole('button', { name: '편집', exact: true }).click()
    await page.getByRole('menuitem', { name: mode, exact: true }).click()
  }
  const tickers = () =>
    page.getByRole('heading', { level: 3 }).allTextContents()
  const savedOrder = () =>
    page.evaluate(() => localStorage.getItem('stock-sort-order'))
  if (beforeEditing) await beforeEditing(page, capture)
  await capture('initial')
  await page.getByRole('button', { name: '편집', exact: true }).click()
  await capture('edit-menu')
  await page.getByRole('menuitem', { name: '삭제', exact: true }).click()
  const group = page.getByRole('group', { name: '종목 삭제 편집' })
  await group.getByRole('checkbox', { name: '전체 선택' }).check()
  await expect(page.getByRole('status')).toHaveText('3개 선택됨')
  await group.getByRole('checkbox', { name: '전체 선택' }).uncheck()
  await expect(page.getByRole('status')).toHaveText('0개 선택됨')
  await expect(
    group.getByRole('button', { name: '삭제', exact: true })
  ).toBeDisabled()
  await page.getByRole('checkbox', { name: 'AAPL 선택', exact: true }).check()
  await capture('delete-selection')
  await group.getByRole('button', { name: '삭제', exact: true }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('선택한 AAPL을 관심 종목에서 삭제해요')
  await capture('delete-dialog')
  await dialog.getByRole('button', { name: '취소' }).click()
  await dialog.waitFor({ state: 'hidden' })
  await group.waitFor()
  assert.deepEqual(deleted, [])
  await expect(page.getByRole('status')).toHaveText('1개 선택됨')
  await group.getByRole('button', { name: '완료' }).click()

  async function moveFirst() {
    const item = page.getByRole('button', {
      name: 'AAPL 순서 변경',
      exact: true,
    })
    await item.focus()
    await page.keyboard.press('Space')
    await expect(item).toHaveAttribute('aria-pressed', 'true')
    const announcement = page.locator('[role="status"][aria-live]')
    await expect(announcement).toContainText(
      'was moved over droppable area preview-stock-0.'
    )
    await page.evaluate(
      () =>
        new Promise(resolve => {
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        })
    )
    await page.keyboard.press('ArrowDown')
    await expect(announcement).toContainText(
      'was moved over droppable area preview-stock-1'
    )
    await page.keyboard.press('Space')
    await expect(page.getByRole('heading', { level: 3 }).first()).toHaveText(
      'MSFT'
    )
  }
  await edit('순서 변경')
  await moveFirst()
  await capture('reorder')
  await page.getByRole('button', { name: '취소', exact: true }).click()
  assert.equal(await savedOrder(), null)
  assert.deepEqual(await tickers(), ['AAPL', 'MSFT', 'NVDA'])
  await edit('순서 변경')
  await moveFirst()
  await page.getByRole('button', { name: '완료', exact: true }).click()
  assert.deepEqual(JSON.parse(await savedOrder()), {
    'preview-stock-1': 0,
    'preview-stock-0': 1,
    'preview-stock-2': 2,
  })
  await page.reload()
  await expect(page.getByRole('heading', { level: 3 }).first()).toHaveText(
    'MSFT'
  )
  await capture('reordered')
  await edit('삭제')
  await page.getByRole('checkbox', { name: 'AAPL 선택', exact: true }).check()
  await group.getByRole('button', { name: '삭제', exact: true }).click()
  await dialog.getByRole('button', { name: '삭제', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(2)
  assert.deepEqual(deleted, ['/api/searches/preview-stock-0'])
  assert.deepEqual(await tickers(), ['MSFT', 'NVDA'])
  assert.deepEqual(JSON.parse(await savedOrder()), {
    'preview-stock-1': 0,
    'preview-stock-2': 1,
  })
  await capture('deleted')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await capture('end')
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    ),
    false
  )
  assert.deepEqual(errors, [])
  return {
    width,
    theme,
    captures,
    errors,
    deleted,
    keyboardReorder: 'saved and cancelled',
    persistence: 'reload verified',
  }
}
