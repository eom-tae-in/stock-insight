import ky from 'ky'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  trendsJobQuerySchema,
  trendsJobSchema,
} from '@/lib/trends-jobs-contract'
import { oidcConfig, OidcError } from './oidc/config'
import { checkCsrf } from './oidc/session'
import { oidcErrorResponse, requestSession } from './oidc/http'

export async function forwardTrendsJob(
  request: NextRequest,
  method: 'GET' | 'POST' | 'DELETE',
  id?: string,
  refresh = false
) {
  try {
    const session = await requestSession()
    if (method !== 'GET')
      checkCsrf(
        request.headers.get('origin'),
        request.headers.get('x-csrf-token'),
        session
      )
    if (id && !z.uuid().safeParse(id).success)
      throw new OidcError('JOB_ID_INVALID', 400)
    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.accessToken}`,
    }
    if (method === 'POST') {
      const key = request.headers.get('idempotency-key')
      if (!key || !/^[a-zA-Z0-9_-]{1,100}$/.test(key))
        throw new OidcError('IDEMPOTENCY_KEY_INVALID', 400)
      headers['Idempotency-Key'] = key
    }
    const input: unknown =
      method === 'POST' && !refresh ? await request.json() : undefined
    const query =
      input === undefined ? undefined : trendsJobQuerySchema.safeParse(input)
    if (query && !query.success) throw new OidcError('QUERY_INVALID', 400)
    const path = `/api/v1/analysis/trends/jobs${id ? `/${id}` : ''}${refresh ? '/refresh' : ''}`
    const response = await ky(new URL(path, oidcConfig().gateway), {
      method,
      headers,
      ...(query?.success ? { json: query.data } : {}),
      timeout: 10000,
      retry: 0,
      redirect: 'error',
      throwHttpErrors: false,
    })
    if (!response.ok)
      throw new OidcError(
        `JOB_REQUEST_${response.status}`,
        [400, 401, 404, 409, 429].includes(response.status)
          ? response.status
          : 502
      )
    if (response.status === 204)
      return new NextResponse(null, {
        status: 204,
        headers: { 'Cache-Control': 'no-store' },
      })
    const body: unknown = await response.json()
    return NextResponse.json(trendsJobSchema.parse(body), {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error: unknown) {
    if (error instanceof SyntaxError)
      return oidcErrorResponse(new OidcError('QUERY_INVALID', 400))
    return oidcErrorResponse(error)
  }
}
