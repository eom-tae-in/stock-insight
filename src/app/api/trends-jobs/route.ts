import { NextRequest } from 'next/server'
import { forwardTrendsJob } from '@/server/trends-jobs-bff'

export function POST(request: NextRequest) {
  return forwardTrendsJob(request, 'POST')
}
