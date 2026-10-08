import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { OidcError, authCookieName, isOidcMode } from './config'
import { readSession } from './session'

export async function requestSession() {
  if (!isOidcMode()) throw new OidcError('OIDC_DISABLED', 404)
  const session = await readSession(
    (await cookies()).get(authCookieName())?.value
  )
  if (!session) throw new OidcError('UNAUTHORIZED', 401)
  return session
}

export function oidcErrorResponse(error: unknown): NextResponse {
  if (error instanceof OidcError)
    return NextResponse.json(
      { error: error.code },
      {
        status: error.status,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  return NextResponse.json(
    { error: 'SERVICE_UNAVAILABLE' },
    {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
