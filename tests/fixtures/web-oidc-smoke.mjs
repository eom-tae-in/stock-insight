import { createServer } from 'node:http'
import { randomBytes, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import ky from 'ky'
import { captureThemeMatrix, verifyThemePreferences } from './ui-theme-qa.mjs'
import { startOidcProvider, listen, stop } from './oidc-provider.ts'
import { startRedisFixture } from './redis-server.ts'

const artifacts = await mkdtemp(join(tmpdir(), 'stock-insight-web-qa-'))
const provider = await startOidcProvider()
const redis = await startRedisFixture()
let job = null
let polls = 0
const gateway = createServer((request, response) => {
  void (async () => {
    response.setHeader('Content-Type', 'application/json')
    if (request.headers.authorization !== 'Bearer fixture-access') {
      response.writeHead(401).end()
      return
    }
    if (request.method === 'DELETE') {
      job = null
      response.writeHead(204).end()
      return
    }
    if (request.method === 'POST') {
      let query = job?.query
      if (!request.url.endsWith('/refresh')) {
        let body = ''
        for await (const chunk of request) body += chunk.toString()
        query = JSON.parse(body)
      }
      const now = new Date()
      job = {
        id: job?.id ?? randomUUID(),
        generation: (job?.generation ?? 0) + 1,
        query,
        state: 'PENDING',
        requestedAt: now.toISOString(),
        deadline: new Date(Date.now() + 300000).toISOString(),
        points: [],
        errorCode: null,
        provider: null,
      }
      polls = 0
      response.writeHead(202).end(JSON.stringify(job))
      return
    }
    if (!job) {
      response.writeHead(404).end()
      return
    }
    polls++
    const noData = job.query.keyword === 'no-data'
    job = {
      ...job,
      state: polls > 1 ? (noData ? 'FAILED' : 'SUCCEEDED') : 'RUNNING',
      errorCode: polls > 1 && noData ? 'NO_DATA' : null,
      provider: polls > 1 ? 'fixture-v1' : null,
      points:
        polls > 1 && !noData
          ? Array.from({ length: 65 }, (_, i) => ({
              date: new Date(Date.UTC(2025, 0, 6 + i * 7))
                .toISOString()
                .slice(0, 10),
              value: 20 + i,
            }))
          : [],
    }
    response.end(JSON.stringify(job))
  })().catch(() => response.writeHead(500).end())
})
const gatewayUrl = await listen(gateway)
const reservation = createServer()
const origin = await listen(reservation)
await stop(reservation)
const application = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    new URL(origin).port,
  ],
  {
    env: {
      ...process.env,
      WEB_AUTH_MODE: 'oidc',
      OIDC_ISSUER: provider.issuer,
      OIDC_CLIENT_ID: 'stock-insight-web',
      OIDC_ALLOW_LOCAL_HTTP: 'true',
      WEB_ORIGIN: origin,
      ANALYSIS_GATEWAY_URL: gatewayUrl,
      WEB_SESSION_REDIS_URL: redis.url,
      WEB_SESSION_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  }
)
let logs = ''
application.stdout.on('data', chunk => {
  logs += chunk.toString()
})
application.stderr.on('data', chunk => {
  logs += chunk.toString()
})
let browser
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await ky(`${origin}/login`, { timeout: 1000, retry: 0 })
      ready = true
      break
    } catch {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  assert(ready, `Next startup failed: ${logs}`)
  assert.equal(
    (
      await ky(`${origin}/design-preview/components`, {
        retry: 0,
        throwHttpErrors: false,
      })
    ).status,
    404
  )
  assert.equal(
    (
      await ky(`${origin}/design-preview/shell`, {
        retry: 0,
        throwHttpErrors: false,
      })
    ).status,
    404
  )
  assert.equal(
    (
      await ky(`${origin}/design-preview/custom-charts`, {
        retry: 0,
        throwHttpErrors: false,
      })
    ).status,
    404
  )
  assert.equal(
    (
      await ky(`${origin}/design-preview/stock-edit`, {
        retry: 0,
        throwHttpErrors: false,
      })
    ).status,
    404
  )
  browser = await chromium.launch({
    channel: 'chrome',
    args: ['--disable-gpu'],
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/login`)
  await verifyThemePreferences(page)
  await captureThemeMatrix(page, { screen: 'login', artifacts })
  await page.getByRole('link', { name: /로그인/ }).click()
  await page.waitForURL('**/trends-jobs')
  await page.getByRole('button', { name: '화면 모드 선택' }).click()
  await page.waitForFunction(
    () =>
      document.activeElement instanceof HTMLInputElement &&
      document.activeElement.value === 'dark'
  )
  await page.keyboard.press('ArrowRight')
  assert(await page.getByRole('radio', { name: '시스템' }).isChecked())
  assert.equal(
    await page.evaluate(() => localStorage.getItem('theme')),
    'system'
  )
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForFunction(() =>
    document.documentElement.classList.contains('dark')
  )
  await page.emulateMedia({ colorScheme: 'light' })
  await page.waitForFunction(() =>
    document.documentElement.classList.contains('light')
  )
  await page.keyboard.press('Escape')
  assert(
    await page
      .getByRole('button', { name: '화면 모드 선택' })
      .evaluate(element => element === document.activeElement)
  )
  await page.getByLabel('검색어', { exact: true }).fill('coffee')
  await page.getByRole('button', { name: '분석 요청', exact: true }).click()
  await page.getByText('분석 완료', { exact: true }).waitFor()
  await page.locator('.recharts-surface').waitFor()
  await captureThemeMatrix(page, { screen: 'result', artifacts })
  await captureThemeMatrix(page, { screen: 'account', artifacts })
  await page.screenshot({
    path: join(artifacts, 'desktop-light.png'),
    fullPage: true,
  })
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark')
    location.reload()
  })
  await page.waitForLoadState('networkidle')
  await page.getByLabel('검색어', { exact: true }).fill('coffee')
  await page.getByRole('button', { name: '분석 요청', exact: true }).click()
  await page.getByText('분석 완료', { exact: true }).waitFor()
  await page.screenshot({
    path: join(artifacts, 'desktop-dark.png'),
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({
    path: join(artifacts, 'phone-dark.png'),
    fullPage: true,
  })
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
  await page.screenshot({
    path: join(artifacts, 'phone-light.png'),
    fullPage: true,
  })
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    ),
    'Mobile overflow'
  )
  await page.getByText('주간 데이터 표 보기', { exact: true }).click()
  assert.equal(await page.locator('tbody tr').count(), 65)
  const generation = job.generation
  const refreshCompleted = page.waitForResponse(async response => {
    if (
      !response.url().endsWith(`/api/trends-jobs/${job.id}`) ||
      response.request().method() !== 'GET' ||
      !response.ok()
    )
      return false
    const result = await response.json()
    return result.generation === generation + 1 && result.state === 'SUCCEEDED'
  })
  const refreshResponse = page.waitForResponse(
    response =>
      response.url().endsWith(`/api/trends-jobs/${job.id}/refresh`) &&
      response.request().method() === 'POST'
  )
  await page.getByRole('button', { name: '다시 분석', exact: true }).click()
  const refreshed = await refreshResponse
  assert.equal(refreshed.status(), 202)
  assert.equal((await refreshed.json()).generation, generation + 1)
  await refreshCompleted
  await page.getByText('분석 완료', { exact: true }).waitFor()
  assert.equal(job.generation, generation + 1)
  const csrfResponse = await context.request.post(`${origin}/api/trends-jobs`, {
    headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
    data: { keyword: 'coffee', geo: '', timeframe: 'today 5-y', gprop: '' },
  })
  assert.equal(csrfResponse.status(), 403)
  await page.getByLabel('검색어', { exact: true }).fill('no-data')
  await page.getByRole('button', { name: '분석 요청', exact: true }).click()
  await page
    .getByRole('alert')
    .filter({ hasText: '분석할 데이터가 없어요.' })
    .waitFor()
  const finalPolls = polls
  await new Promise(resolve => setTimeout(resolve, 1200))
  assert.equal(polls, finalPolls, 'Polling must stop after a failed job')
  await page.screenshot({
    path: join(artifacts, 'no-data.png'),
    fullPage: true,
  })
  const cookie = (await context.cookies()).find(
    value => value.name === 'stock-insight-session'
  )
  assert(cookie?.httpOnly && cookie.value.length === 43)
  assert(
    !JSON.stringify(await context.storageState()).includes('fixture-access')
  )
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await page.getByRole('heading', { name: '첫 분석을 시작하세요' }).waitFor()
  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  await page.waitForURL('**/login')
  assert(
    !(await context.cookies()).some(
      value => value.name === 'stock-insight-session'
    )
  )
  assert.equal(
    (
      await context.request.get(`${origin}/api/trends-jobs/${randomUUID()}`)
    ).status(),
    401
  )
  assert.deepEqual(errors, [])
  await writeFile(
    join(artifacts, 'result.json'),
    JSON.stringify(
      {
        passed: true,
        scope: 'real Next/Redis/browser; fixture OIDC/Gateway',
        screenshots: 29,
      },
      null,
      2
    )
  )
  console.log(`PASS web OIDC/Trends browser smoke: ${artifacts}`)
} finally {
  await browser?.close()
  application.kill('SIGTERM')
  if (application.exitCode === null)
    await new Promise(resolve => application.once('exit', resolve))
  await stop(gateway)
  await stop(provider.server)
  await redis.close()
}
