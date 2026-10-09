import { DashboardClient } from '@/components/stock/dashboard-client'
import { getAppShellData } from '@/server/app-shell-data'
import { linkedStockInterests } from '@/lib/stock/list-summary'

export const dynamic = 'force-dynamic'

export default async function StockAnalysisPage() {
  const { records, keywords, shell } = await getAppShellData()
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl leading-8 font-bold tracking-tight">
          관심 종목
        </h1>
        <p className="text-text-secondary mt-2 text-sm">
          저장한 종목의 주간 변화와 연결 키워드를 비교해요.
        </p>
        <p className="text-tertiary mt-2 text-xs tabular-nums">
          {shell.week} · {shell.weekRange} · 완료 주 기준
        </p>
      </header>
      <DashboardClient
        initialRecords={records}
        interests={linkedStockInterests(keywords)}
      />
      <p className="text-tertiary text-xs leading-5">
        종가는 완료된 주의 마지막 가격이에요. 13주선 괴리는 종가와 13주
        이동평균의 차이, 52주 YoY는 13주 이동평균의 전년 대비 변화예요. 연결
        관심도는 저장된 5년 분석을 기준으로 표시해요.
      </p>
    </section>
  )
}
