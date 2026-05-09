import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/server/admin-auth'
import { getAdminSummary } from '@/server/admin-service'
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client'

export const metadata: Metadata = {
  title: '운영 대시보드 | StockInsight',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminUser = await getAdminUser(supabase)
  if (!adminUser) {
    notFound()
  }

  const summary = await getAdminSummary()

  return <AdminDashboardClient initialSummary={summary} />
}
