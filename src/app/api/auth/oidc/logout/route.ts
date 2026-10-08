import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  authCookieName,
  authCookieOptions,
  oidcConfig,
} from '@/server/oidc/config'
import { checkCsrf, deleteSession } from '@/server/oidc/session'
import { logoutUrl } from '@/server/oidc/provider'
import { oidcErrorResponse, requestSession } from '@/server/oidc/http'

export async function POST(request: NextRequest) {
  try {
    const session = await requestSession()
    const form = await request.formData()
    const csrf = form.get('csrf')
    checkCsrf(
      request.headers.get('origin'),
      typeof csrf === 'string' ? csrf : null,
      session
    )
    const id = (await cookies()).get(authCookieName())?.value
    if (id) await deleteSession(id)
    let destination: URL
    try {
      destination = await logoutUrl(session)
    } catch {
      destination = new URL('/login?error=auth_error', oidcConfig().origin)
    }
    const response = NextResponse.redirect(destination, 303)
    response.cookies.set(authCookieName(), '', {
      ...authCookieOptions(),
      maxAge: 0,
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error: unknown) {
    return oidcErrorResponse(error)
  }
}
