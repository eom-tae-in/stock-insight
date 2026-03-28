/**
 * Keyword Searches API Routes
 * POST /api/keyword-searches - Create/update keyword search with trends data
 * GET /api/keyword-searches - Get all keyword searches for authenticated user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getAllKeywordSearches,
  upsertKeywordSearch,
  deleteKeywordSearch,
} from '@/lib/db/queries'
import { KeywordSearchRecord } from '@/types/database'
import { randomUUID } from 'crypto'

/**
 * GET /api/keyword-searches
 * Retrieve all keyword searches for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자의 모든 keyword searches 조회
    const keywordSearches = await getAllKeywordSearches(supabase)

    return NextResponse.json(
      {
        data: keywordSearches,
        count: keywordSearches.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[GET /api/keyword-searches] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch keyword searches' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/keyword-searches
 * Create or update a keyword search with trends data
 *
 * Request body:
 * {
 *   keyword: string,
 *   trendsData: TrendsDataPoint[],
 *   ma13?: number,
 *   yoy_change?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { keyword, trendsData, ma13, yoy_change } = body

    // 입력 검증
    if (!keyword || !trendsData || !Array.isArray(trendsData)) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields: keyword, trendsData' },
        { status: 400 }
      )
    }

    // KeywordSearchRecord 생성
    const record: KeywordSearchRecord = {
      id: randomUUID(),
      user_id: user.id,
      keyword,
      ma13,
      yoy_change,
      trends_data: trendsData,
      searched_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Upsert keyword search
    const keywordSearchId = await upsertKeywordSearch(record, supabase)

    return NextResponse.json(
      {
        data: {
          id: keywordSearchId,
          keyword,
          ma13,
          yoy_change,
          trendsDataCount: trendsData.length,
        },
        message: 'Keyword search saved successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/keyword-searches] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save keyword search' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/keyword-searches
 * Delete a keyword search (requires id in query params)
 *
 * Query params:
 * - id: UUID of the keyword search to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const keywordSearchId = searchParams.get('id')

    if (!keywordSearchId) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    // Delete keyword search (RLS ensures user can only delete their own)
    const deleted = await deleteKeywordSearch(keywordSearchId, supabase)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Keyword search not found or already deleted' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Keyword search deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[DELETE /api/keyword-searches] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete keyword search' },
      { status: 500 }
    )
  }
}
