/**
 * 로컬 개발용 Google Trends API Route
 * GET /api/trends-internal?keyword=...
 * POST /api/trends-internal
 * Response: [{ date, value }, ...]
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchInternalTrendsData,
  TrendsProviderError,
} from '@/server/trends-internal-service'
import { normalizeKeywordSpacing } from '@/lib/utils/keyword-normalization'

/**
 * Python 스크립트 기반 Google Trends 조회
 */
async function getTrendsData(
  keyword: string,
  geo: string,
  timeframe: string,
  gprop: string
) {
  const trendsData = await fetchInternalTrendsData({
    keyword,
    geo,
    timeframe,
    gprop,
  })
  return NextResponse.json(trendsData, { status: 200 })
}

export async function GET(request: NextRequest) {
  try {
    const keyword = request.nextUrl.searchParams.get('keyword') || ''
    const geo = request.nextUrl.searchParams.get('geo') || ''
    const timeframe = request.nextUrl.searchParams.get('timeframe') || '5y'
    const gprop = request.nextUrl.searchParams.get('gprop') || ''

    const normalizedKeyword = normalizeKeywordSpacing(keyword)

    if (!normalizedKeyword) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      )
    }

    return await getTrendsData(normalizedKeyword, geo, timeframe, gprop)
  } catch (error) {
    console.error('trends-internal GET error:', error)
    const status = error instanceof TrendsProviderError ? error.status : 502
    const code =
      error instanceof TrendsProviderError ? error.code : 'TRENDS_FETCH_FAILED'
    const message =
      error instanceof Error
        ? error.message
        : '트렌드 데이터를 가져오지 못했습니다.'

    return NextResponse.json({ error: message, code }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keyword, geo = '', timeframe = '5y', gprop = '' } = body

    const normalizedKeyword = normalizeKeywordSpacing(keyword || '')

    if (!normalizedKeyword) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      )
    }

    return await getTrendsData(normalizedKeyword, geo, timeframe, gprop)
  } catch (error) {
    console.error('trends-internal POST error:', error)
    const status = error instanceof TrendsProviderError ? error.status : 502
    const code =
      error instanceof TrendsProviderError ? error.code : 'TRENDS_FETCH_FAILED'
    const message =
      error instanceof Error
        ? error.message
        : '트렌드 데이터를 가져오지 못했습니다.'

    return NextResponse.json({ error: message, code }, { status })
  }
}
