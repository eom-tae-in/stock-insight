/**
 * Task: 키워드 검색 API Route
 *
 * GET /api/keyword-searches
 * Response: ApiResponse<KeywordSearchRecord[]>
 *
 * POST /api/keyword-searches
 * Body: { keyword: string, trendsData: TrendsDataPoint[], ma13: number, yoy_change: number }
 * Response: ApiResponse<KeywordSearchRecord>
 *
 * DELETE /api/keyword-searches?id={id}
 * Response: ApiResponse<{ id: string }>
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getAllKeywordSearches,
  upsertKeywordSearch,
  deleteKeywordSearch,
  insertKeywordTrendsData,
} from '@/lib/db/queries'
import { createErrorResponse } from '@/lib/api-helpers'
import type { ApiResponse, KeywordSearchRecord, TrendsDataPoint } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 인증 확인
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (!user || authError) {
      return createErrorResponse('UNAUTHORIZED', '로그인이 필요합니다.', 401)
    }

    // 저장된 키워드 목록 조회
    const keywords = await getAllKeywordSearches(supabase)

    // 성공 응답
    const response: ApiResponse<KeywordSearchRecord[]> = {
      success: true,
      data: keywords,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error fetching keyword searches:', error)
    return createErrorResponse(
      'DB_ERROR',
      '키워드 목록을 불러오지 못했습니다.',
      500
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (!user || authError) {
      return createErrorResponse('UNAUTHORIZED', '로그인이 필요합니다.', 401)
    }

    // 요청 바디 파싱
    const body = await request.json()
    const {
      keyword,
      trendsData,
      ma13,
      yoy_change,
    }: {
      keyword: string
      trendsData: TrendsDataPoint[]
      ma13?: number
      yoy_change?: number
    } = body

    // 유효성 검사
    if (!keyword || !Array.isArray(trendsData)) {
      return createErrorResponse(
        'INVALID_INPUT',
        '키워드와 트렌드 데이터가 필요합니다.',
        400
      )
    }

    // 키워드 저장
    const keywordSearchId = await upsertKeywordSearch(
      {
        id: '', // 새로 생성됨
        user_id: user.id,
        keyword,
        ma13,
        yoy_change,
        trends_data: trendsData,
        searched_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_viewed_at: undefined,
      },
      supabase
    )

    // 트렌드 데이터 저장
    if (trendsData.length > 0) {
      await insertKeywordTrendsData(keywordSearchId, trendsData, supabase)
    }

    // 성공 응답 (조회를 통해 생성된 데이터 반환)
    const savedKeyword = await getAllKeywordSearches(supabase)
    const created = savedKeyword.find(k => k.id === keywordSearchId)

    if (!created) {
      throw new Error('Failed to retrieve created keyword')
    }

    const response: ApiResponse<KeywordSearchRecord> = {
      success: true,
      data: created,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating keyword search:', error)
    return createErrorResponse(
      'DB_ERROR',
      '키워드 저장 중 오류가 발생했습니다.',
      500
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (!user || authError) {
      return createErrorResponse('UNAUTHORIZED', '로그인이 필요합니다.', 401)
    }

    // 쿼리 파라미터에서 id 추출
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    // ID 검증
    if (!id || id.length === 0) {
      return createErrorResponse('INVALID_ID', '유효하지 않은 ID입니다.', 400)
    }

    // 키워드 삭제
    const deleted = await deleteKeywordSearch(id, supabase)

    if (!deleted) {
      return createErrorResponse(
        'NOT_FOUND',
        '해당 키워드를 찾을 수 없습니다.',
        404
      )
    }

    // 성공 응답
    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error deleting keyword search:', error)
    return createErrorResponse(
      'DB_ERROR',
      '키워드 삭제 중 오류가 발생했습니다.',
      500
    )
  }
}
