/**
 * Task 013: 대시보드 Page (Server Component)
 *
 * DB에서 저장된 종목 목록을 조회하고
 * Client Component에 전달
 */

import { Header } from '@/components/layout/header'
import { Container } from '@/components/layout/container'
import { DashboardClient } from '@/components/dashboard-client'
import { getAllSearches } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // Server Component에서 DB 직접 조회
  const records = await getAllSearches()

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
