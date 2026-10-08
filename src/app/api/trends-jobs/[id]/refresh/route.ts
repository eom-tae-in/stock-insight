import { NextRequest } from 'next/server'
import { forwardTrendsJob } from '@/server/trends-jobs-bff'

export async function POST(
  request: NextRequest,
  context: { readonly params: Promise<{ readonly id: string }> }
) {
  return forwardTrendsJob(request, 'POST', (await context.params).id, true)
}
