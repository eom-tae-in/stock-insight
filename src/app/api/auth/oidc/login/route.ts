import { NextRequest, NextResponse } from 'next/server'
import * as oidc from 'openid-client'
import {
  authCookieOptions,
  isOidcMode,
  loginCookieName,
  safeOidcNext,
} from '@/server/oidc/config'
import { authStore, seal } from '@/server/oidc/store'
import { authorizationUrl } from '@/server/oidc/provider'
import { randomSecret } from '@/server/oidc/session'
import { oidcErrorResponse } from '@/server/oidc/http'

export async function GET(request: NextRequest) {
  if (!isOidcMode())
    return NextResponse.json({ error: 'OIDC_DISABLED' }, { status: 404 })
  try {
    const id = randomSecret()
    const flow = {
      state: oidc.randomState(),
      nonce: oidc.randomNonce(),
      verifier: oidc.randomPKCECodeVerifier(),
      next: safeOidcNext(request.nextUrl.searchParams.get('next')),
    }
    const url = await authorizationUrl(flow)
    await (await authStore()).put(`flow:${id}`, seal(flow), 600)
    const response = NextResponse.redirect(url)
    response.cookies.set(loginCookieName(), id, {
      ...authCookieOptions(),
      maxAge: 600,
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error: unknown) {
    return oidcErrorResponse(error)
  }
}
