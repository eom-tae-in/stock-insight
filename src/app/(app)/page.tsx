/**
 * Task 013: 대시보드 Page (Server Component)
 *
 * DB에서 저장된 종목 목록을 조회하고
 * Client Component에 전달
 *
 * Phase 7: 인증된 클라이언트로 자신의 데이터만 조회 (RLS 적용)
 */

import { Container } from '@/components/layout/container'
import { DashboardClient } from '@/components/stock/dashboard-client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAllSearches } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // 인증된 서버 클라이언트로 DB 조회 (RLS 적용됨)
  const supabase = await createSupabaseServerClient()

  // 사용자 정보 조회
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // 미인증 상태 처리
  if (!user || authError) {
    return (
      <Container className="py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-200">
            로그인이 필요합니다.
          </p>
        </div>
      </Container>
    )
  }

  // userId를 전달하여 RLS 검증 (필수)
  const records = await getAllSearches(user.id, supabase)

  return (
    <Container className="py-8">
      {/* 데이터 수집 기준 안내 */}
      <div className="text-muted-foreground mb-8 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/30">
        <p className="text-sm">
          📊 모든 데이터는 지난주(금요일)까지 수집됩니다.
        </p>
        <p className="text-sm">
          전주 대비 수익률, 최근 13주 평균, 52주 전 대비 수익률은 종가 기준으로
          계산됩니다.
        </p>
      </div>

      {/* 저장된 종목 제목 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">저장된 종목</h1>
      </div>

      {/* Client Component에 데이터 전달 */}
      <DashboardClient initialRecords={records} />
    </Container>
  )
}
