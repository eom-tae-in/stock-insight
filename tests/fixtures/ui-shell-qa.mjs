import assert from 'node:assert/strict'
import { join } from 'node:path'

export async function inspectShell(page, { origin, artifacts, width, theme }) {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto(`${origin}/design-preview/shell`)
  await page
    .getByRole('heading', { name: '앱 셸 미리보기', exact: true })
    .waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(
    mode => document.documentElement.classList.contains(mode),
    theme
  )
  const noOverflow = async () =>
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    )
  await noOverflow()
  const fonts = await page.evaluate(() =>
    Array.from(document.fonts)
      .filter(font => font.status === 'loaded')
      .map(font => font.family)
  )
  assert(fonts.some(font => font.includes('Pretendard')))
  const captures = []
  const capture = async name => {
    const path = join(artifacts, `${width}-${theme}-${name}.png`)
    await page.screenshot({ path, animations: 'disabled' })
    captures.push(path)
  }
  const sidebar = page.getByRole('complementary', { name: '사이드바' })
  const mobile = page.getByRole('navigation', { name: '모바일 내비게이션' })
  assert.equal(await sidebar.isVisible(), width >= 1024)
  assert.equal(await mobile.isVisible(), width < 1024)
  assert.equal(
    await page
      .locator('header')
      .evaluate(element => element.getBoundingClientRect().height),
    width < 1024 ? 52 : 64
  )
  if (width >= 1024) {
    assert.equal(
      await sidebar.evaluate(element => element.getBoundingClientRect().width),
      240
    )
    const watch = sidebar.getByRole('region', { name: '관심 종목' })
    assert.equal(await watch.locator('a[href^="/stock-analysis/"]').count(), 5)
    assert(await sidebar.getByText('2주 이상 미갱신 3건').isVisible())
    assert.equal(
      await page
        .getByRole('link', { name: '종목, 티커, 키워드 검색' })
        .getAttribute('href'),
      '/search'
    )
    assert.equal(
      await page.getByRole('link', { name: '새 분석' }).getAttribute('href'),
      '/keyword-analysis/new'
    )
  } else {
    assert.equal(
      await mobile.evaluate(element => element.getBoundingClientRect().height),
      86
    )
    assert.equal(await mobile.getByRole('link').count(), 4)
    assert.equal(
      await mobile
        .getByRole('link', { name: '검색', exact: true })
        .getAttribute('href'),
      '/search'
    )
  }
  await capture('default')
  const trigger = page.getByRole('button', {
    name: width < 1024 ? '내 정보' : '계정 메뉴',
    exact: true,
  })
  await trigger.hover()
  await capture('account-hover')
  await trigger.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  assert(await trigger.evaluate(element => element.matches(':focus-visible')))
  assert.notEqual(
    await trigger.evaluate(element => getComputedStyle(element).boxShadow),
    'none'
  )
  await capture('account-focus')
  await page.keyboard.press('Enter')
  const popup = page.getByRole(width < 1024 ? 'dialog' : 'menu')
  await popup.waitFor()
  const backgroundTrigger = page.getByRole('button', {
    name: width < 1024 ? '내 정보' : '계정 메뉴',
    exact: true,
    includeHidden: true,
  })
  assert.equal(
    await backgroundTrigger.getAttribute('aria-controls'),
    await popup.getAttribute('id'),
    'trigger and popup retain the same ID relationship'
  )
  if (width >= 1024)
    assert.equal(
      await popup.getAttribute('aria-labelledby'),
      await backgroundTrigger.getAttribute('id'),
      'menu label points to its trigger'
    )
  assert(await popup.getByText('demo@example.test').isVisible())
  const radios = popup.getByRole('radio')
  assert.equal(await radios.count(), 3)
  assert(
    await popup
      .getByRole('radio', {
        name: theme === 'light' ? '라이트' : '다크',
        exact: true,
      })
      .isChecked()
  )
  assert(
    await page.evaluate(
      () =>
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement.type === 'radio'
    )
  )
  await capture('account-open')
  const opposite = theme === 'light' ? '다크' : '라이트'
  await popup.getByRole('radio', { name: opposite, exact: true }).focus()
  await page.keyboard.press('Space')
  await page.waitForFunction(
    mode => document.documentElement.classList.contains(mode),
    theme === 'light' ? 'dark' : 'light'
  )
  await popup
    .getByRole('radio', {
      name: theme === 'light' ? '라이트' : '다크',
      exact: true,
    })
    .focus()
  await page.keyboard.press('Space')
  await page.waitForFunction(
    mode => document.documentElement.classList.contains(mode),
    theme
  )
  await page.keyboard.press('Escape')
  assert(await trigger.evaluate(element => element === document.activeElement))
  await page.getByRole('button', { name: '종목 순서 뒤집기' }).click()
  assert.match(
    await page.locator('[data-qa="stock-order"] li').first().innerText(),
    /AAPL/
  )
  if (width >= 1024)
    assert.equal(
      await sidebar
        .locator('a[href^="/stock-analysis/"]')
        .first()
        .getAttribute('href'),
      '/stock-analysis/aapl'
    )
  await page.reload()
  await page.waitForFunction(() =>
    document
      .querySelector('[data-qa="stock-order"] li')
      ?.textContent?.includes('AAPL')
  )
  await page.getByRole('button', { name: '상세 화면 전환' }).click()
  await page.getByRole('heading', { name: 'NVDA', exact: true }).waitFor()
  if (width < 1024)
    assert.equal(
      await page.getByRole('link', { name: '뒤로가기' }).getAttribute('href'),
      '/stock-analysis'
    )
  if (width < 1024) {
    const center = await page
      .locator('header span:visible')
      .filter({ hasText: 'NVDA' })
      .evaluate(element => {
        const rect = element.getBoundingClientRect()
        return rect.x + rect.width / 2
      })
    assert(Math.abs(center - width / 2) <= 1, 'mobile detail title is centered')
  }
  await capture('detail')
  await page.getByRole('button', { name: '상세 화면 전환' }).click()
  if (width >= 1024) {
    assert.equal(
      await sidebar
        .getByRole('link', { name: '운영 대시보드', exact: true })
        .count(),
      0
    )
    await page.getByRole('button', { name: '관리자 표시 전환' }).click()
    assert(
      await sidebar
        .getByRole('link', { name: '운영 대시보드', exact: true })
        .isVisible()
    )
    await capture('admin')
    await page.getByRole('button', { name: '관리자 표시 전환' }).click()
  }
  await page.getByRole('button', { name: '빈 목록 전환' }).click()
  assert.equal(await page.locator('[data-qa="stock-order"] li').count(), 0)
  if (width >= 1024) {
    assert(await sidebar.getByText('관심 종목 0개 모두 보기').isVisible())
    assert.equal(await sidebar.getByText(/2주 이상 미갱신/).count(), 0)
  }
  await capture('empty')
  await page.getByRole('button', { name: '빈 목록 전환' }).click()
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  )
  await capture('end')
  await noOverflow()
  assert.deepEqual(errors, [])
  return {
    width,
    theme,
    fonts,
    captures,
    errors,
    shellGeometry:
      'sidebar 240 / desktop header 64 / mobile header 52 / bottom tabs 86',
    ordering: 'same-tab consumers and reload persistence',
    account: 'keyboard open, theme selection, Escape restores focus',
  }
}
