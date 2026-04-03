/**
 * Task 013: 대시보드 Page (Server Component)
 *
 * DB에서 저장된 종목 목록을 조회하고
 * Client Component에 전달
 *
 * Phase 7: 인증된 클라이언트로 자신의 데이터만 조회 (RLS 적용)
 */

import { Header } from '@/components/layout/header'
import { Container } from '@/components/layout/container'
import { DashboardClient } from '@/components/dashboard-client'
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
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 pb-24">
          <Container className="py-8">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950">
              <p className="text-sm text-red-700 dark:text-red-200">
                로그인이 필요합니다.
              </p>
            </div>
          </Container>
        </main>
      </div>
    )
  }

  // userId를 전달하여 RLS 검증 (필수)
  const records = await getAllSearches(user.id, supabase)

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-24">
        <Container className="py-8">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold">저장된 종목</h1>
          </div>

          {/* Client Component에 데이터 전달 */}
          <DashboardClient initialRecords={records} />
        </Container>
      </main>
    </div>
  )
}
