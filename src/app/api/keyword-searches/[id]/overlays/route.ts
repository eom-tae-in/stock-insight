/**
 * Keyword Stock Overlays API Routes
 * POST /api/keyword-searches/[id]/overlays - Add stock overlay to keyword search
 * GET /api/keyword-searches/[id]/overlays - Get all stock overlays for keyword search
 * DELETE /api/keyword-searches/[id]/overlays?overlayId=... - Remove stock overlay
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getKeywordStockOverlays,
  addStockOverlay,
  removeStockOverlay,
  getKeywordSearchById,
} from '@/lib/db/queries'

/**
 * GET /api/keyword-searches/[id]/overlays
 * Retrieve all stock overlays for a keyword search
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: keywordSearchId } = await params

    // 키워드 검색이 존재하는지 확인 (소유권 검증)
    const keywordSearch = await getKeywordSearchById(keywordSearchId, supabase)
    if (!keywordSearch) {
      return NextResponse.json(
        { error: 'Keyword search not found' },
        { status: 404 }
      )
    }

    // 모든 stock overlays 조회
    const overlays = await getKeywordStockOverlays(keywordSearchId, supabase)

    return NextResponse.json(
      {
        data: overlays,
        count: overlays.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[GET /api/keyword-searches/[id]/overlays] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock overlays' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/keyword-searches/[id]/overlays
 * Add a stock overlay to a keyword search
 *
 * Request body:
 * {
 *   searchId: string (UUID of the stock search record),
 *   displayOrder?: number (optional, default 0)
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: keywordSearchId } = await params
    const body = await request.json()
    const { searchId, displayOrder } = body

    // 입력 검증
    if (!searchId) {
      return NextResponse.json(
        { error: 'Missing required field: searchId' },
        { status: 400 }
      )
    }

    // 키워드 검색이 존재하는지 확인 (소유권 검증)
    const keywordSearch = await getKeywordSearchById(keywordSearchId, supabase)
    if (!keywordSearch) {
      return NextResponse.json(
        { error: 'Keyword search not found' },
        { status: 404 }
      )
    }

    // Stock overlay 추가
    const overlayId = await addStockOverlay(
      keywordSearchId,
      searchId,
      displayOrder,
      supabase
    )

    return NextResponse.json(
      {
        data: {
          id: overlayId,
          keywordSearchId,
          searchId,
          displayOrder: displayOrder ?? 0,
        },
        message: 'Stock overlay added successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/keyword-searches/[id]/overlays] Error:', error)

    // Unique constraint violation (stock already added to this keyword)
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'This stock is already added to this keyword search' },
        { status: 409 }
      )
    }

    // Foreign key violation (searchId or keywordSearchId not found)
    if (error instanceof Error && error.message.includes('foreign')) {
      return NextResponse.json(
        { error: 'Invalid searchId or keyword search not found' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to add stock overlay' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/keyword-searches/[id]/overlays
 * Remove a stock overlay from a keyword search
 *
 * Query params:
 * - overlayId: UUID of the overlay to delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: keywordSearchId } = await params
    const { searchParams } = new URL(request.url)
    const overlayId = searchParams.get('overlayId')

    if (!overlayId) {
      return NextResponse.json(
        { error: 'Missing required parameter: overlayId' },
        { status: 400 }
      )
    }

    // 키워드 검색이 존재하는지 확인 (소유권 검증)
    const keywordSearch = await getKeywordSearchById(keywordSearchId, supabase)
    if (!keywordSearch) {
      return NextResponse.json(
        { error: 'Keyword search not found' },
        { status: 404 }
      )
    }

    // Stock overlay 삭제
    const deleted = await removeStockOverlay(overlayId, supabase)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Stock overlay not found or already deleted' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Stock overlay removed successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[DELETE /api/keyword-searches/[id]/overlays] Error:', error)
    return NextResponse.json(
      { error: 'Failed to remove stock overlay' },
      { status: 500 }
    )
  }
}
