import { NextRequest } from 'next/server'
import { forwardTrendsJob } from '@/server/trends-jobs-bff'

type Context = { readonly params: Promise<{ readonly id: string }> }
export async function GET(request: NextRequest, context: Context) {
  return forwardTrendsJob(request, 'GET', (await context.params).id)
}
export async function DELETE(request: NextRequest, context: Context) {
  return forwardTrendsJob(request, 'DELETE', (await context.params).id)
}
