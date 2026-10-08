import { NextRequest, NextResponse } from 'next/server'
import {
  authCookieName,
  authCookieOptions,
  isOidcMode,
  loginCookieName,
  oidcConfig,
  safeOidcNext,
} from '@/server/oidc/config'
import { authStore, unseal } from '@/server/oidc/store'
import { exchangeCode, flowSchema } from '@/server/oidc/provider'
import { createSession, sessionIdSchema } from '@/server/oidc/session'

export async function GET(request: NextRequest) {
  if (!isOidcMode())
    return NextResponse.json({ error: 'OIDC_DISABLED' }, { status: 404 })
  const origin = new URL(oidcConfig().origin).origin
  try {
    const id = request.cookies.get(loginCookieName())?.value
    if (!id || !sessionIdSchema.safeParse(id).success) return failed(origin)
    const raw = await (await authStore()).take(`flow:${id}`)
    if (!raw) return failed(origin)
    const flow = unseal(raw, flowSchema)
    const callback = new URL('/api/auth/oidc/callback', origin)
    callback.search = request.nextUrl.search
    const tokens = await exchangeCode(callback, flow)
    const created = await createSession(tokens)
    const response = NextResponse.redirect(
      new URL(safeOidcNext(flow.next), origin)
    )
    response.cookies.set(authCookieName(), created.id, {
      ...authCookieOptions(),
      maxAge: 28800,
    })
    response.cookies.set(loginCookieName(), '', {
      ...authCookieOptions(),
      maxAge: 0,
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error: unknown) {
    if (error instanceof Error) return failed(origin)
    throw error
  }
}

function failed(origin: string) {
  const response = NextResponse.redirect(
    new URL('/login?error=auth_error', origin)
  )
  response.cookies.set(loginCookieName(), '', {
    ...authCookieOptions(),
    maxAge: 0,
  })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
