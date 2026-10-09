import assert from 'node:assert/strict'
import { join } from 'node:path'

export async function captureThemeMatrix(page, { screen, artifacts }) {
  for (const theme of ['light', 'dark']) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (
        await page.evaluate(
          value => document.documentElement.classList.contains(value),
          theme
        )
      )
        break
      await page.getByRole('button', { name: '테마 전환' }).click()
    }
    for (const width of [390, 1280, 1440, 1920]) {
      await page.setViewportSize({
        width,
        height: width === 390 ? 844 : 1000,
      })
      await page.evaluate(() => document.fonts.ready)
      if (screen === 'result') {
        await page.waitForFunction(() => {
          const container = document.querySelector(
            '[aria-label="주간 검색 관심도 차트"]'
          )
          const svg = container?.querySelector('svg.recharts-surface')
          return (
            container &&
            svg &&
            Math.abs(
              svg.getBoundingClientRect().width - container.clientWidth
            ) < 2 &&
            container.querySelector('.recharts-line-curve')
          )
        })
      }
      const appearance = await page.evaluate(() => {
        const style = getComputedStyle(document.body)
        return {
          background: style.backgroundColor,
          font: style.fontFamily,
          overflow: document.documentElement.scrollWidth > innerWidth,
        }
      })
      assert.equal(
        appearance.background,
        theme === 'dark' ? 'rgb(11, 13, 18)' : 'rgb(243, 244, 246)'
      )
      assert(appearance.font.startsWith('"Pretendard Variable"'))
      assert.equal(
        appearance.overflow,
        false,
        `${screen}/${width}/${theme} overflow`
      )
      await page.waitForFunction(() =>
        document
          .getAnimations()
          .every(animation => animation.playState !== 'running')
      )
      if (screen === 'result') {
        const tickColor = await page
          .locator('.recharts-cartesian-axis-tick-value')
          .first()
          .evaluate(element => getComputedStyle(element).fill)
        assert.equal(
          tickColor,
          theme === 'dark' ? 'rgb(133, 144, 163)' : 'rgb(101, 109, 123)'
        )
      }
      await page.evaluate(
        () =>
          new Promise(resolve =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          )
      )
      if (screen === 'account') {
        await page.getByRole('button', { name: '화면 모드 선택' }).click()
        await page.waitForFunction(() =>
          document
            .getAnimations()
            .every(animation => animation.playState !== 'running')
        )
        const opacity = await page
          .getByRole('menu')
          .evaluate(element => getComputedStyle(element).opacity)
        assert.equal(opacity, '1')
      }
      await page.screenshot({
        path: join(artifacts, `${screen}-${width}-${theme}.png`),
        fullPage: true,
      })
      if (screen === 'account') await page.keyboard.press('Escape')
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
}

export async function verifyThemePreferences(page) {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForFunction(() =>
    document.documentElement.classList.contains('dark')
  )
  assert.equal(await page.evaluate(() => localStorage.getItem('theme')), null)
  await page.evaluate(() => localStorage.setItem('theme', 'calm'))
  await page.reload()
  await page.waitForFunction(
    () =>
      localStorage.getItem('theme') === 'system' &&
      document.documentElement.classList.contains('dark') &&
      !document.documentElement.classList.contains('calm')
  )
  await page.emulateMedia({ colorScheme: 'light' })
  await page.waitForFunction(() =>
    document.documentElement.classList.contains('light')
  )
  await page.getByRole('button', { name: '테마 전환' }).click()
  await page.waitForFunction(() =>
    document.documentElement.classList.contains('dark')
  )
  assert.equal(await page.evaluate(() => localStorage.getItem('theme')), 'dark')
  await page.reload()
  await page.waitForFunction(() =>
    document.documentElement.classList.contains('dark')
  )
  const scopedColors = await page.evaluate(() => {
    const scope = document.createElement('div')
    scope.className = 'light bg-card text-foreground dark:bg-primary'
    const control = document.createElement('div')
    control.className = 'bg-card dark:bg-primary'
    const popover = document.createElement('div')
    popover.style.backgroundColor = 'var(--popover)'
    scope.append(popover)
    document.body.append(scope)
    document.body.append(control)
    const style = getComputedStyle(scope)
    const values = {
      background: style.backgroundColor,
      color: style.color,
      chart: style.getPropertyValue('--chart-1').trim(),
      popover: getComputedStyle(popover).backgroundColor,
      darkControl: getComputedStyle(control).backgroundColor,
    }
    scope.remove()
    control.remove()
    return values
  })
  assert.deepEqual(scopedColors, {
    background: 'rgb(255, 255, 255)',
    color: 'rgb(18, 21, 28)',
    chart: '#7a45f0',
    popover: 'rgb(255, 255, 255)',
    darkControl: 'rgb(122, 69, 240)',
  })
}
