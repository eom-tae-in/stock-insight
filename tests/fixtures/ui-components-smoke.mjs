import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import ky from 'ky'
import { inspectComponents } from './ui-components-qa.mjs'
import { inspectShell } from './ui-shell-qa.mjs'
import { inspectCustomCharts } from './ui-custom-charts-qa.mjs'
import { inspectStockList } from './ui-stock-list-qa.mjs'
import { inspectStockDetail } from './ui-stock-detail-qa.mjs'
import { inspectStockEdit } from './ui-stock-edit-qa.mjs'
import { startOidcProvider, listen, stop } from './oidc-provider.ts'
import { startRedisFixture } from './redis-server.ts'

const scenario = [
  {
    flag: '--stock-detail',
    stage: 'UI-5e',
    path: '/design-preview/stock-detail',
    prefix: 'stock-insight-ui5e-',
    inspect: inspectStockDetail,
    wide: true,
  },
  {
    flag: '--stock-list',
    stage: 'UI-5c',
    path: '/design-preview/stock-list',
    prefix: 'stock-insight-ui5c-',
    inspect: inspectStockList,
    wide: true,
  },
  {
    flag: '--stock-edit',
    stage: 'UI-5b',
    path: '/design-preview/stock-edit',
    prefix: 'stock-insight-ui5b-',
    inspect: inspectStockEdit,
    wide: true,
  },
  {
    flag: '--custom-charts',
    stage: 'UI-5a',
    path: '/design-preview/custom-charts',
    prefix: 'stock-insight-ui5a-',
    inspect: inspectCustomCharts,
    wide: true,
  },
  {
    flag: '--shell',
    stage: 'UI-3',
    path: '/design-preview/shell',
    prefix: 'stock-insight-ui3-',
    inspect: inspectShell,
    wide: false,
  },
].find(item => process.argv.includes(item.flag)) ?? {
  stage: 'UI-2',
  path: '/design-preview/components',
  prefix: 'stock-insight-ui2-',
  inspect: inspectComponents,
  wide: false,
}
const stage = scenario.stage
const previewPath = scenario.path
const artifacts = await mkdtemp(join(tmpdir(), scenario.prefix))
const provider = await startOidcProvider()
const redis = await startRedisFixture()
const gateway = createServer((_request, response) =>
  response.writeHead(404).end()
)
const gatewayUrl = await listen(gateway)
const reservation = createServer()
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve))
const address = reservation.address()
assert(address && typeof address !== 'string')
const port = address.port
await new Promise(resolve => reservation.close(resolve))
const origin = `http://127.0.0.1:${port}`
const application = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    'dev',
    '--turbopack',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(port),
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
      NEXT_PUBLIC_DISABLE_REACT_DEVTOOLS: 'true',
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
let primaryFailure
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (application.exitCode !== null || application.signalCode !== null) break
    try {
      const response = await ky(`${origin}${previewPath}`, {
        timeout: 1500,
        retry: 0,
      })
      ready = response.status === 200
      if (ready) break
    } catch (error) {
      if (!(error instanceof Error)) throw error
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  assert(ready, `Next development startup failed: ${logs}`)
  browser = await chromium.launch({
    channel: 'chrome',
    args: ['--disable-gpu'],
  })
  browser.on('disconnected', () => console.log(`${stage} browser closed`))
  const results = []
  for (const width of scenario.wide
    ? [390, 1280, 1440, 1920]
    : [390, 1280, 1440]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        colorScheme: theme,
        reducedMotion: 'reduce',
        isMobile: width === 390,
        hasTouch: width === 390,
        deviceScaleFactor: width === 390 ? 3 : 1,
      })
      context.setDefaultTimeout(10000)
      context.setDefaultNavigationTimeout(30000)
      await context.addInitScript(
        mode => localStorage.setItem('theme', mode),
        theme
      )
      try {
        console.log(`${stage} QA: ${width}px ${theme}`)
        const page = await context.newPage()
        results.push(
          await scenario.inspect(page, {
            origin,
            artifacts,
            width,
            theme,
          })
        )
      } finally {
        await context.close()
      }
    }
  }
  await writeFile(
    join(artifacts, 'result.json'),
    JSON.stringify(
      {
        passed: true,
        scope:
          'real Next development server / Chrome; fixed presentation data only',
        results,
      },
      null,
      2
    )
  )
  console.log(`PASS ${stage} browser QA: ${artifacts}`)
} catch (error) {
  primaryFailure = error
  await writeFile(
    join(artifacts, 'failure.json'),
    JSON.stringify(
      {
        passed: false,
        error: error instanceof Error ? error.stack : String(error),
      },
      null,
      2
    )
  )
  console.error(`FAIL ${stage} browser QA: ${artifacts}`)
  throw error
} finally {
  await writeFile(join(artifacts, 'next.log'), logs)
  const cleanup = await Promise.allSettled([
    browser?.close(),
    (async () => {
      if (application.exitCode !== null || application.signalCode !== null)
        return
      await new Promise(resolve => {
        const timer = setTimeout(() => application.kill('SIGKILL'), 5000)
        application.once('exit', () => {
          clearTimeout(timer)
          resolve()
        })
        application.kill('SIGTERM')
      })
    })(),
    stop(gateway),
    stop(provider.server),
    redis.close(),
  ])
  const cleanupErrors = cleanup
    .filter(result => result.status === 'rejected')
    .map(result => result.reason)
  await writeFile(
    join(artifacts, 'cleanup.json'),
    JSON.stringify(
      {
        passed: cleanupErrors.length === 0,
        errors: cleanupErrors.map(error =>
          error instanceof Error ? error.message : String(error)
        ),
      },
      null,
      2
    )
  )
  if (cleanupErrors.length && !primaryFailure)
    throw new AggregateError(cleanupErrors, `${stage} fixture cleanup failed`)
}
