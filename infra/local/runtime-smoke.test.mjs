import assert from 'node:assert/strict'
import { before, test } from 'node:test'
import { randomBytes, createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { z } from 'zod'

const issuer = 'http://localhost:8180/realms/stock-insight'
const gateway = 'http://localhost:8080'
const tokenResponse = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
})
const principalResponse = z.object({
  issuer: z.url(),
  subject: z.string().min(1),
})
let tokens

async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(10_000) })
}

async function waitUntilReady() {
  const deadline = Date.now() + 180_000
  while (Date.now() < deadline) {
    try {
      const responses = await Promise.all([
        request(`${gateway}/actuator/health`),
        request(`${issuer}/.well-known/openid-configuration`),
      ])
      if (responses.every(response => response.ok)) return
    } catch (error) {
      if (!(error instanceof TypeError || error instanceof DOMException))
        throw error
    }
    await delay(1000)
  }
  throw new Error('Gateway/OIDC readiness deadline exceeded')
}

async function login() {
  const verifier = randomBytes(32).toString('base64url')
  const state = randomBytes(16).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const redirectUri = 'http://localhost:3000/api/auth/callback'
  const authorize = new URL(`${issuer}/protocol/openid-connect/auth`)
  authorize.search = new URLSearchParams({
    client_id: 'stock-insight-web',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid',
    state,
    nonce: randomBytes(16).toString('base64url'),
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString()
  const page = await request(authorize, { redirect: 'manual' })
  assert.equal(page.status, 200, 'OIDC login form must be available')
  const html = await page.text()
  const actionMatch = html.match(/<form[^>]+action="([^"]+)"/)
  assert.ok(actionMatch?.[1], 'OIDC form action must be present')
  const action = new URL(actionMatch[1].replaceAll('&amp;', '&'))
  assert.equal(
    action.origin,
    new URL(issuer).origin,
    'Fixture credentials stay on OIDC origin'
  )
  const cookies = page.headers
    .getSetCookie()
    .map(cookie => cookie.split(';')[0])
    .join('; ')
  const authenticated = await request(action, {
    method: 'POST',
    redirect: 'manual',
    headers: { Cookie: cookies },
    body: new URLSearchParams({
      username: 'local-user',
      password: 'local-user-only',
    }),
  })
  assert.equal(
    authenticated.status,
    302,
    'Fixture login must redirect with an authorization code'
  )
  const location = authenticated.headers.get('location')
  assert.ok(location, 'Callback location must be present')
  const callback = new URL(location)
  assert.equal(callback.origin + callback.pathname, redirectUri)
  assert.equal(callback.searchParams.get('state'), state)
  const code = callback.searchParams.get('code')
  assert.ok(code, 'Callback must include an authorization code')
  const exchange = await request(`${issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'stock-insight-web',
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier,
    }),
  })
  assert.equal(
    exchange.status,
    200,
    'Code with matching PKCE must exchange successfully'
  )
  return tokenResponse.parse(await exchange.json())
}

before(
  async () => {
    await waitUntilReady()
    tokens = await login()
    const deadline = Date.now() + 90_000
    while (Date.now() < deadline) {
      const responses = await Promise.all(
        ['analysis', 'market'].map(service =>
          request(`${gateway}/api/v1/${service}/principal`, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          })
        )
      )
      if (responses.every(response => response.status === 200)) return
      for (const response of responses) {
        assert.ok(
          response.status === 200 || response.status === 503,
          'Only pending service discovery may delay route readiness'
        )
      }
      await delay(1000)
    }
    throw new Error('Eureka route readiness deadline exceeded')
  },
  { timeout: 300_000 }
)

for (const service of ['analysis', 'market']) {
  test(`${service} rejects anonymous requests`, async () => {
    const response = await request(`${gateway}/api/v1/${service}/principal`)
    assert.equal(response.status, 401)
  })

  test(`${service} accepts signed OIDC identity through Eureka routing`, async () => {
    const response = await request(`${gateway}/api/v1/${service}/principal`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'X-User-Id': 'spoofed-owner',
        'X-Correlation-Id': 'spoofed-correlation',
      },
    })
    assert.equal(response.status, 200)
    const principal = principalResponse.parse(await response.json())
    assert.equal(principal.issuer, issuer)
    assert.notEqual(principal.subject, 'spoofed-owner')
    assert.match(
      response.headers.get('x-correlation-id') ?? '',
      /^[0-9a-f-]{36}$/
    )
  })

  test(`${service} rejects a tampered bearer token`, async () => {
    const segments = tokens.access_token.split('.')
    assert.equal(segments.length, 3)
    const altered = `${segments[0]}.${segments[1]}.${randomBytes(32).toString('base64url')}`
    const response = await request(`${gateway}/api/v1/${service}/principal`, {
      headers: { Authorization: `Bearer ${altered}` },
    })
    assert.equal(response.status, 401)
  })
}

test('OIDC requires PKCE for the web client', async () => {
  const authorize = new URL(`${issuer}/protocol/openid-connect/auth`)
  authorize.search = new URLSearchParams({
    client_id: 'stock-insight-web',
    redirect_uri: 'http://localhost:3000/api/auth/callback',
    response_type: 'code',
    scope: 'openid',
    state: randomBytes(16).toString('base64url'),
  }).toString()
  const response = await request(authorize, { redirect: 'manual' })
  assert.equal(response.status, 302)
  const callback = new URL(response.headers.get('location') ?? '')
  assert.equal(callback.searchParams.get('error'), 'invalid_request')
})

test('OIDC refresh issues a token accepted by the business service', async () => {
  const response = await request(`${issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: 'stock-insight-web',
      refresh_token: tokens.refresh_token,
    }),
  })
  assert.equal(response.status, 200)
  const refreshed = tokenResponse.parse(await response.json())
  const result = await request(`${gateway}/api/v1/analysis/principal`, {
    headers: { Authorization: `Bearer ${refreshed.access_token}` },
  })
  assert.equal(result.status, 200)
})
