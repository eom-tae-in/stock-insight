import { createServer, type Server, type IncomingMessage } from 'node:http'
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto'
import { z } from 'zod'

async function body(request: IncomingMessage): Promise<string> {
  let text = ''
  for await (const chunk of request) {
    if (!Buffer.isBuffer(chunk))
      throw new TypeError('Fixture request chunks must be buffers')
    text += chunk.toString('utf8')
  }
  return text
}

export async function listen(server: Server): Promise<string> {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new TypeError('Fixture must use a TCP port')
  return `http://127.0.0.1:${address.port}`
}

export async function stop(server: Server): Promise<void> {
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve()))
  )
}

export async function startOidcProvider() {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const jwk = keys.publicKey.export({ format: 'jwk' })
  const clientId = 'stock-insight-web'
  const codes = new Map<
    string,
    {
      readonly nonce: string
      readonly challenge: string
      readonly redirect: string
    }
  >()
  let issuer = ''
  let tokenNonce: string | undefined
  let refreshCount = 0
  let wrongNonce = false
  let invalidSignature = false
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  function idToken(nonce?: string) {
    const now = Math.floor(Date.now() / 1000)
    const input = `${encode({ alg: 'RS256', kid: 'fixture-key' })}.${encode({ iss: issuer, aud: clientId, sub: 'fixture-user', preferred_username: '샘플 사용자', iat: now, exp: now + 600, ...(nonce ? { nonce } : {}) })}`
    const signature = sign('RSA-SHA256', Buffer.from(input), keys.privateKey)
    if (invalidSignature) signature[0] = (signature[0] ?? 0) ^ 1
    return `${input}.${signature.toString('base64url')}`
  }
  const server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? '/', issuer || 'http://127.0.0.1')
      response.setHeader('Content-Type', 'application/json')
      if (url.pathname.endsWith('/.well-known/openid-configuration')) {
        response.end(
          JSON.stringify({
            issuer,
            authorization_endpoint: `${issuer}/authorize`,
            token_endpoint: `${issuer}/token`,
            jwks_uri: `${issuer}/jwks`,
            end_session_endpoint: `${issuer}/logout`,
            response_types_supported: ['code'],
            subject_types_supported: ['public'],
            id_token_signing_alg_values_supported: ['RS256'],
            token_endpoint_auth_methods_supported: ['none'],
            code_challenge_methods_supported: ['S256'],
          })
        )
      } else if (url.pathname === '/jwks') {
        response.end(
          JSON.stringify({
            keys: [{ ...jwk, kid: 'fixture-key', use: 'sig', alg: 'RS256' }],
          })
        )
      } else if (url.pathname === '/authorize') {
        const code = randomUUID()
        const parameters = z
          .object({
            nonce: z.string(),
            code_challenge: z.string(),
            redirect_uri: z.url(),
            state: z.string(),
          })
          .parse(Object.fromEntries(url.searchParams))
        codes.set(code, {
          nonce: parameters.nonce,
          challenge: parameters.code_challenge,
          redirect: parameters.redirect_uri,
        })
        const callback = new URL(parameters.redirect_uri)
        callback.searchParams.set('code', code)
        callback.searchParams.set('state', parameters.state)
        response.writeHead(302, { Location: callback.href }).end()
      } else if (url.pathname === '/token') {
        const parameters = new URLSearchParams(await body(request))
        if (parameters.get('grant_type') === 'authorization_code') {
          const code = parameters.get('code') ?? ''
          const flow = codes.get(code)
          codes.delete(code)
          const verifier = parameters.get('code_verifier')
          const { createHash } = await import('node:crypto')
          if (
            !flow ||
            !verifier ||
            createHash('sha256').update(verifier).digest('base64url') !==
              flow.challenge ||
            parameters.get('redirect_uri') !== flow.redirect
          ) {
            response
              .writeHead(400)
              .end(JSON.stringify({ error: 'invalid_grant' }))
            return
          }
          tokenNonce = flow.nonce
        } else {
          refreshCount++
          if (parameters.get('refresh_token') !== 'fixture-refresh') {
            response
              .writeHead(400)
              .end(JSON.stringify({ error: 'invalid_grant' }))
            return
          }
        }
        response.end(
          JSON.stringify({
            access_token: 'fixture-access',
            refresh_token: 'fixture-refresh',
            id_token: idToken(wrongNonce ? 'wrong' : tokenNonce),
            token_type: 'Bearer',
            expires_in: 120,
          })
        )
      } else if (url.pathname === '/logout') {
        response
          .writeHead(302, {
            Location: url.searchParams.get('post_logout_redirect_uri') ?? '/',
          })
          .end()
      } else response.writeHead(404).end()
    })().catch((error: unknown) => {
      response.writeHead(500).end(
        JSON.stringify({
          error: error instanceof Error ? error.name : 'fixture_error',
        })
      )
    })
  })
  issuer = await listen(server)
  return {
    server,
    issuer,
    refreshCount: () => refreshCount,
    setWrongNonce: (value: boolean) => {
      wrongNonce = value
    },
    setInvalidSignature: (value: boolean) => {
      invalidSignature = value
    },
  }
}
