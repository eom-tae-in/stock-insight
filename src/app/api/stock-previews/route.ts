import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createErrorResponse,
  createSuccessResponse,
  validateApiAuth,
} from '@/lib/api-helpers'
import { TickerInputSchema } from '@/lib/validation'
import {
  createStockPreview,
  StockPreviewServiceError,
} from '@/server/stock-preview-service'
import { getSearchByTicker } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await validateApiAuth(supabase)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = (await request.json()) as { ticker?: unknown }
    const result = TickerInputSchema.safeParse(body.ticker)
    if (!result.success) {
      return createErrorResponse(
        'INVALID_TICKER',
        '올바른 종목 심볼을 입력하세요.',
        400
      )
    }

    const ticker = result.data
    const existingSearch = await getSearchByTicker(
      ticker,
      authResult.userId,
      supabase
    )
    if (existingSearch) {
      return createErrorResponse(
        'ALREADY_SAVED',
        '이미 저장된 종목입니다.',
        409
      )
    }

    const preview = await createStockPreview(ticker)
    return createSuccessResponse(preview, 201)
  } catch (error) {
    if (error instanceof StockPreviewServiceError) {
      return createErrorResponse(error.code, error.message, error.status)
    }

    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('No price data')) {
      return createErrorResponse(
        'TICKER_NOT_FOUND',
        '종목을 찾을 수 없습니다. 정확한 심볼을 확인해주세요.',
        404
      )
    }

    console.error('Error in POST /api/stock-previews:', error)
    return createErrorResponse(
      'PREVIEW_FAILED',
      '종목 미리보기 생성 중 오류가 발생했습니다.',
      500
    )
  }
}
