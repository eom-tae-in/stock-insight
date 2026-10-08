import assert from 'node:assert/strict'
import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'

export async function inspectComponents(
  page,
  { origin, artifacts, width, theme }
) {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/design-preview/components`)
  await page
    .getByRole('heading', { name: '공통 컴포넌트', exact: true })
    .waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(
    mode => document.documentElement.classList.contains(mode),
    theme
  )
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  )
  const style = await page.locator('body').evaluate(element => ({
    background: getComputedStyle(element).backgroundColor,
    font: getComputedStyle(element).fontFamily,
  }))
  assert.equal(
    style.background,
    theme === 'light' ? 'rgb(243, 244, 246)' : 'rgb(11, 13, 18)'
  )
  assert.match(style.font, /Pretendard/)
  const loadedFonts = await page.evaluate(() =>
    Array.from(document.fonts)
      .filter(font => font.status === 'loaded')
      .map(font => font.family)
  )
  assert(loadedFonts.some(family => family.includes('Pretendard')))
  assert.equal(
    await page
      .locator('thead tr')
      .evaluate(element => element.getBoundingClientRect().height),
    40
  )
  const prefix = `${width}-${theme}`
  const captures = []
  const capture = async (locator, name) => {
    const path = join(artifacts, `${prefix}-${name}.png`)
    await locator.screenshot({ path, animations: 'disabled' })
    captures.push(path)
  }
  await capture(page.locator('main'), 'default')
  for (const [index, section] of (
    await page.locator('main section').all()
  ).entries())
    await capture(section, `section-${index + 1}-default`)
  const rows = []
  const controls = [
    ['primary', page.locator('[data-qa="primary"]')],
    ['secondary', page.locator('[data-qa="secondary"]')],
    ['ghost', page.locator('[data-qa="ghost"]')],
    ['danger', page.locator('[data-qa="danger"]')],
    ['icon', page.getByRole('button', { name: '다운로드', exact: true })],
    [
      'segment',
      page
        .getByRole('radiogroup', { name: '기간', exact: true })
        .getByRole('radio', { name: '1Y' }),
    ],
    ['select', page.getByRole('combobox', { name: '기간 선택' })],
    ['series', page.getByRole('button', { name: '검색 관심도', exact: true })],
    ['tab', page.getByRole('tab', { name: '차트', exact: true })],
    ['search', page.getByRole('searchbox', { name: '종목 검색' })],
    ['input', page.getByRole('textbox', { name: '이메일', exact: true })],
    ['checkbox', page.getByRole('checkbox', { name: '비교 표시' })],
    ['list-row', page.getByRole('link', { name: /NVDA/ })],
    ['menu', page.getByRole('button', { name: '항목 메뉴' })],
    ['popover', page.getByRole('button', { name: '도움말 팝오버' })],
    ['dialog', page.getByRole('button', { name: '삭제 대화상자' })],
  ]
  for (const [name, control] of controls) {
    await control.hover()
    const hovered = await control.evaluate(element => ({
      background: getComputedStyle(element).backgroundColor,
      border: getComputedStyle(element).borderColor,
    }))
    const section = control.locator('xpath=ancestor::section')
    if (['primary', 'select', 'search', 'list-row'].includes(name))
      await capture(section, `${name}-hover`)
    await control.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    assert(
      await control.evaluate(element => document.activeElement === element),
      `${name}: keyboard focus`
    )
    const focused = await control.evaluate(element => ({
      shadow: getComputedStyle(element).boxShadow,
      outline: getComputedStyle(element).outlineWidth,
      focusVisible: element.matches(':focus-visible'),
    }))
    assert(focused.focusVisible, `${name}: focus-visible`)
    assert(
      focused.shadow !== 'none' || Number.parseFloat(focused.outline) >= 2,
      `${name}: focus ring`
    )
    if (['primary', 'select', 'search', 'list-row'].includes(name))
      await capture(section, `${name}-focus`)
    rows.push({ name, hovered, focused })
  }
  for (const variant of ['primary', 'secondary', 'ghost', 'danger']) {
    const control = page.locator(`[data-qa="${variant}"]`)
    await control.hover()
    await page.mouse.down()
    assert(await control.evaluate(element => element.matches(':active')))
    await page.mouse.up()
  }
  const disabled = page.locator('button:disabled, input:disabled')
  const disabledStates = await disabled.evaluateAll(elements =>
    elements.map(element => ({
      name: element.getAttribute('aria-label') || element.textContent,
      opacity: getComputedStyle(element).opacity,
    }))
  )
  assert(disabledStates.length >= 10)
  assert(disabledStates.every(state => state.opacity === '0.4'))
  assert.equal(
    await page
      .locator('[data-change="up"]')
      .first()
      .evaluate(element => getComputedStyle(element).color),
    theme === 'light' ? 'rgb(207, 34, 56)' : 'rgb(255, 91, 103)'
  )
  assert.equal(
    await page
      .locator('[data-change="down"]')
      .first()
      .evaluate(element => getComputedStyle(element).color),
    theme === 'light' ? 'rgb(31, 99, 214)' : 'rgb(90, 151, 255)'
  )
  assert.equal(
    await page
      .locator('[data-change="flat"]')
      .first()
      .evaluate(element => getComputedStyle(element).color),
    theme === 'light' ? 'rgb(74, 82, 97)' : 'rgb(167, 176, 191)'
  )
  const radio = page
    .getByRole('radiogroup', { name: '기간', exact: true })
    .getByRole('radio', { name: '1Y' })
  await radio.focus()
  await page.keyboard.down('ArrowRight')
  const group = page.getByRole('radiogroup', { name: '기간', exact: true })
  await writeFile(
    join(artifacts, `${prefix}-keyboard.json`),
    JSON.stringify(
      await group.getByRole('radio').evaluateAll(elements =>
        elements.map(element => ({
          label: element.textContent,
          checked: element.getAttribute('aria-checked'),
          value: element.getAttribute('value'),
          focused: element === document.activeElement,
        }))
      ),
      null,
      2
    )
  )
  try {
    await page.waitForFunction(() =>
      Array.from(
        document.querySelectorAll(
          '[role="radiogroup"][aria-label="기간"] [role="radio"]'
        )
      ).some(
        element =>
          element.textContent === '3Y' &&
          element.getAttribute('aria-checked') === 'true'
      )
    )
  } finally {
    await page.keyboard.up('ArrowRight')
  }
  const select = page.getByRole('combobox', { name: '기간 선택' })
  await select.click()
  await page.getByRole('option', { name: '5Y', exact: true }).waitFor()
  await page.screenshot({
    path: join(artifacts, `${prefix}-select-open.png`),
    animations: 'disabled',
  })
  captures.push(join(artifacts, `${prefix}-select-open.png`))
  await page.getByRole('option', { name: '5Y', exact: true }).click()
  assert(
    await page
      .getByRole('radiogroup', { name: '기간', exact: true })
      .getByRole('radio', { name: '5Y' })
      .isChecked()
  )
  await page.getByRole('tab', { name: '데이터 표' }).click()
  assert(
    await page
      .getByRole('tabpanel')
      .getByText('선택한 기간의 데이터 표')
      .isVisible()
  )
  const checkbox = page.getByRole('checkbox', { name: '비교 표시' })
  await checkbox.focus()
  await page.keyboard.press('Space')
  assert(await checkbox.isChecked())
  await page.getByRole('button', { name: '삭제 대화상자' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  assert.equal(
    await dialog.evaluate(element => getComputedStyle(element).maxWidth),
    width < 640 ? 'calc(100% - 32px)' : '420px'
  )
  await capture(dialog, 'dialog-open')
  await page.keyboard.press('Escape')
  assert(
    await page
      .getByRole('button', { name: '삭제 대화상자' })
      .evaluate(element => element === document.activeElement)
  )
  await page.getByRole('button', { name: '항목 메뉴' }).click()
  await page.getByRole('menu').waitFor()
  await capture(page.getByRole('menu'), 'menu-open')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '도움말 팝오버' }).click()
  await page.getByText('표시 기준을 확인하세요.').waitFor()
  await capture(page.getByRole('dialog'), 'popover-open')
  await page.keyboard.press('Escape')
  const missingValue = page
    .locator('[data-change="flat"]')
    .filter({ hasText: '—' })
    .first()
  await missingValue.scrollIntoViewIfNeeded()
  await missingValue.focus()
  await page.getByRole('tooltip').waitFor()
  const missingReason = join(artifacts, `${prefix}-missing-reason.png`)
  await page.screenshot({ path: missingReason, animations: 'disabled' })
  captures.push(missingReason)
  await page.keyboard.press('Escape')
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  )
  const end = join(artifacts, `${prefix}-end.png`)
  await page.screenshot({ path: end, animations: 'disabled' })
  captures.push(end)
  assert.deepEqual(errors, [])
  return {
    width,
    theme,
    style,
    loadedFonts,
    rows,
    disabledStates,
    captures,
    errors,
  }
}
