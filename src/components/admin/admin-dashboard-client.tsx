'use client'

import { useState } from 'react'
import { Activity, AlertTriangle, Database, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/layout/container'
import { apiFetchJson } from '@/lib/fetch-client'
import { cn } from '@/lib/utils'
import type {
  AdminMetric,
  AdminRecentAnalysis,
  AdminRecentOverlay,
  AdminStatusLevel,
  AdminSummary,
} from '@/server/admin-service'

type AdminDashboardClientProps = {
  initialSummary: AdminSummary
}

const statusLabel: Record<AdminStatusLevel, string> = {
  ok: '정상',
  warning: '주의',
  error: '오류',
  disabled: '비활성',
}

const statusClassName: Record<AdminStatusLevel, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  warning:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  error:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
  disabled:
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300',
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMetricValue(metric: AdminMetric) {
  if (metric.value === null) return '확인 불가'
  return metric.value.toLocaleString('ko-KR')
}

function StatusBadge({ status }: { status: AdminStatusLevel }) {
  return (
    <Badge
      variant="outline"
      className={cn('shrink-0', statusClassName[status])}
    >
      {statusLabel[status]}
    </Badge>
  )
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="text-muted-foreground px-4 py-8 text-center text-sm"
      >
        표시할 데이터가 없습니다.
      </td>
    </tr>
  )
}

function AnalysesTable({ rows }: { rows: AdminRecentAnalysis[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
            <th className="px-4 py-3">키워드</th>
            <th className="px-4 py-3">조건</th>
            <th className="px-4 py-3">데이터 기간</th>
            <th className="px-4 py-3 text-right">포인트</th>
            <th className="px-4 py-3">갱신일</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={5} />
          ) : (
            rows.map(row => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{row.keyword}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {row.region} / {row.searchType} / {row.period}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {row.firstDate ?? '-'} ~ {row.lastDate ?? '-'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.pointCount.toLocaleString('ko-KR')}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {formatDate(row.refreshedAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function OverlaysTable({ rows }: { rows: AdminRecentOverlay[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
            <th className="px-4 py-3">티커</th>
            <th className="px-4 py-3">키워드</th>
            <th className="px-4 py-3">조건</th>
            <th className="px-4 py-3">주가 데이터 기간</th>
            <th className="px-4 py-3 text-right">포인트</th>
            <th className="px-4 py-3">갱신일</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={6} />
          ) : (
            rows.map(row => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="font-semibold">{row.ticker}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {row.companyName}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{row.keyword}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {row.conditionLabel}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {row.firstDate ?? '-'} ~ {row.lastDate ?? '-'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.pointCount.toLocaleString('ko-KR')}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {formatDate(row.refreshedAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function AdminDashboardClient({
  initialSummary,
}: AdminDashboardClientProps) {
  const [summary, setSummary] = useState(initialSummary)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const data = await apiFetchJson<AdminSummary>('/api/admin/summary')
      setSummary(data)
      toast.success('관리자 대시보드를 새로고침했습니다.')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : '관리자 대시보드 새로고침에 실패했습니다.'
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Container className="py-8 pb-16" size="xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">운영 대시보드</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            수집 상태, 저장 데이터, 갱신 현황을 읽기 전용으로 확인합니다.
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            마지막 생성: {formatDateTime(summary.generatedAt)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-10"
        >
          <RefreshCw
            className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')}
          />
          새로고침
        </Button>
      </div>

      {summary.scope === 'session' && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          {summary.scopeMessage}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.statuses.map(status => (
          <Card key={status.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                {status.label}
              </CardTitle>
              <StatusBadge status={status.status} />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-5">
                {status.message}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summary.metrics.map(metric => (
          <Card key={metric.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-xs font-medium">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatMetricValue(metric)}
              </div>
              {metric.helper && (
                <p className="text-muted-foreground mt-1 text-xs">
                  {metric.helper}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              최근 분석 조건
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AnalysesTable rows={summary.recentAnalyses} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              최근 티커 연동
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <OverlaysTable rows={summary.recentOverlays} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            데이터 점검 항목
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.anomalies.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              점검할 이상 항목이 없습니다.
            </p>
          ) : (
            <div className="grid gap-3">
              {summary.anomalies.map(item => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="grid gap-2 rounded-md border p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                >
                  <Badge
                    variant="outline"
                    className={
                      item.type === 'analysis'
                        ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300'
                        : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                    }
                  >
                    {item.type === 'analysis' ? '분석' : '티커'}
                  </Badge>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {item.label}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {item.detail}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    {item.reason}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  )
}
