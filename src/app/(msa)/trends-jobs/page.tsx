import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isOidcMode, OidcError } from '@/server/oidc/config'
import { requestSession } from '@/server/oidc/http'
import { TrendsJobsClient } from '@/components/trends-jobs/trends-jobs-client'
import { OidcShell } from '@/components/layout/oidc-shell'

export const metadata: Metadata = {
  title: '검색 관심도 분석 | StockInsight',
  description: '주간 검색 관심도 분석을 요청하고 결과를 확인하세요.',
}

export default async function TrendsJobsPage() {
  if (!isOidcMode()) redirect('/login')
  const session = await requestSession().catch((error: unknown) => {
    if (error instanceof OidcError && error.status === 401) redirect('/login')
    throw error
  })
  return (
    <OidcShell displayName={session.displayName} csrf={session.csrf}>
      <TrendsJobsClient csrf={session.csrf} />
    </OidcShell>
  )
}
