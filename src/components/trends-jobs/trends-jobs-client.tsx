'use client'

import { useEffect, useRef, useState } from 'react'
import ky from 'ky'
import { z } from 'zod'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  trendsJobSchema,
  type TrendsJob,
  type TrendsJobQuery,
} from '@/lib/trends-jobs-contract'

class JobRequestError extends Error {
  constructor(readonly status: number) {
    super(`Job request ${status}`)
  }
}

const statusLabels = {
  PENDING: '대기 중',
  RUNNING: '분석 중',
  SUCCEEDED: '분석 완료',
  FAILED: '분석 실패',
} as const
const failureLabels = {
  NO_DATA: '분석할 데이터가 없어요.',
  DEADLINE_EXCEEDED: '분석 시간이 초과됐어요. 다시 요청해주세요.',
  PROVIDER_FAILED: '데이터를 가져오지 못했어요. 잠시 후 다시 시도해주세요.',
} as const

async function callJob(
  path: string,
  method: 'GET' | 'POST' | 'DELETE',
  csrf: string,
  signal: AbortSignal,
  key?: string,
  query?: TrendsJobQuery
): Promise<TrendsJob | null> {
  const response = await ky(path, {
    method,
    signal,
    timeout: 12000,
    retry: 0,
    throwHttpErrors: false,
    headers: {
      'X-CSRF-Token': csrf,
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    ...(query ? { json: query } : {}),
  })
  if (!response.ok) throw new JobRequestError(response.status)
  if (response.status === 204) return null
  const body: unknown = await response.json()
  return trendsJobSchema.parse(body)
}

function failureMessage(error: unknown): string {
  if (error instanceof JobRequestError) {
    if (error.status === 401) return '로그인이 만료됐어요. 다시 로그인해주세요.'
    if (error.status === 429)
      return '진행 중인 분석이 많아요. 완료된 뒤 다시 요청해주세요.'
    if (error.status === 409)
      return '같은 조건의 분석이 진행 중이거나 요청이 충돌했어요.'
    if (error.status === 404) return '작업이 삭제됐거나 접근할 수 없어요.'
  }
  return '요청을 완료하지 못했어요. 잠시 후 다시 시도해주세요.'
}

export function TrendsJobsClient({ csrf }: { readonly csrf: string }) {
  const [keyword, setKeyword] = useState('')
  const [geo, setGeo] = useState('')
  const [job, setJob] = useState<TrendsJob | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pollCycle, setPollCycle] = useState(0)
  const revision = useRef(0)
  const active = useRef<AbortController | null>(null)
  const stopPolling = useRef<(() => void) | null>(null)
  const intent = useRef<{
    readonly fingerprint: string
    readonly key: string
  } | null>(null)
  const jobId = job?.id
  const generation = job?.generation
  const deadline = job?.deadline
  const terminal = job?.state === 'SUCCEEDED' || job?.state === 'FAILED'

  useEffect(
    () => () => {
      revision.current++
      active.current?.abort()
    },
    []
  )

  useEffect(() => {
    if (!jobId || terminal || !deadline) return
    const controller = new AbortController()
    const snapshot = revision.current
    let inFlight = false
    let stopped = false
    const timer = setInterval(() => void poll(), 1000)
    async function poll() {
      if (
        inFlight ||
        stopped ||
        controller.signal.aborted ||
        snapshot !== revision.current
      )
        return
      if (Date.now() > Date.parse(deadline ?? '') + 5000) {
        setError(
          '상태 확인 시간이 초과됐어요. 다시 확인하거나 새로 요청해주세요.'
        )
        stopped = true
        clearInterval(timer)
        return
      }
      inFlight = true
      try {
        const result = await callJob(
          `/api/trends-jobs/${jobId}`,
          'GET',
          csrf,
          controller.signal
        )
        if (controller.signal.aborted || snapshot !== revision.current) return
        setJob(result)
        if (result?.state !== 'PENDING' && result?.state !== 'RUNNING') {
          stopped = true
          clearInterval(timer)
        }
      } catch (caught: unknown) {
        if (!controller.signal.aborted && snapshot === revision.current)
          setError(failureMessage(caught))
        stopped = true
        clearInterval(timer)
      } finally {
        inFlight = false
      }
    }
    const dispose = () => {
      controller.abort()
      clearInterval(timer)
    }
    stopPolling.current = dispose
    return () => {
      dispose()
      if (stopPolling.current === dispose) stopPolling.current = null
    }
  }, [jobId, generation, deadline, terminal, csrf, pollCycle])

  async function action(kind: 'create' | 'refresh' | 'delete' | 'check') {
    const input = keyword.trim().replace(/\s+/g, ' ')
    if (kind === 'create' && !input) {
      setError('검색어를 입력해주세요.')
      return
    }
    revision.current++
    stopPolling.current?.()
    const snapshot = revision.current
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    setBusy(true)
    setError(null)
    const query: TrendsJobQuery = {
      keyword: input,
      geo,
      timeframe: 'today 5-y',
      gprop: '',
    }
    const fingerprint =
      kind === 'create'
        ? JSON.stringify(query)
        : `${kind}:${jobId}:${generation}`
    if (intent.current?.fingerprint !== fingerprint)
      intent.current = { fingerprint, key: crypto.randomUUID() }
    const path =
      kind === 'create'
        ? '/api/trends-jobs'
        : `/api/trends-jobs/${jobId}${kind === 'refresh' ? '/refresh' : ''}`
    try {
      const result = await callJob(
        path,
        kind === 'check' ? 'GET' : kind === 'delete' ? 'DELETE' : 'POST',
        csrf,
        controller.signal,
        intent.current.key,
        kind === 'create' ? query : undefined
      )
      if (snapshot !== revision.current || controller.signal.aborted) return
      setJob(result)
      intent.current = null
      setPollCycle(value => value + 1)
    } catch (caught: unknown) {
      if (snapshot !== revision.current || controller.signal.aborted) return
      if (
        kind === 'delete' &&
        caught instanceof JobRequestError &&
        caught.status === 404
      )
        setJob(null)
      else setError(failureMessage(caught))
    } finally {
      if (snapshot === revision.current) setBusy(false)
    }
  }

  const failure =
    job?.errorCode && job.errorCode in failureLabels
      ? z
          .enum(['NO_DATA', 'DEADLINE_EXCEEDED', 'PROVIDER_FAILED'])
          .parse(job.errorCode)
      : null
  return (
    <div className="space-y-6 break-keep">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">검색 관심도 분석</h1>
        <p className="text-muted-foreground text-sm">
          검색어의 주간 흐름을 확인하세요. 현재는 샘플 데이터로 분석을
          제공합니다.
        </p>
      </div>
      <form
        className="bg-card space-y-4 rounded-lg border p-6"
        onSubmit={event => {
          event.preventDefault()
          void action('create')
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="trends-keyword">검색어</Label>
            <Input
              id="trends-keyword"
              className="h-11 text-base sm:text-sm"
              value={keyword}
              maxLength={100}
              onChange={event => setKeyword(event.target.value)}
              placeholder="예: coffee"
              disabled={busy}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trends-region">지역</Label>
            <select
              id="trends-region"
              value={geo}
              onChange={event => setGeo(event.target.value)}
              disabled={busy}
              className="bg-background border-input focus-visible:ring-ring h-11 w-full rounded-md border px-3 text-base focus-visible:ring-2 sm:text-sm"
            >
              <option value="">전 세계</option>
              <option value="KR">대한민국</option>
              <option value="US">미국</option>
            </select>
          </div>
          <Button type="submit" size="lg" className="h-11" disabled={busy}>
            {busy ? '처리 중…' : '분석 요청'}
          </Button>
        </div>
      </form>
      {error && (
        <div role="alert" className="bg-card space-y-3 rounded-lg border p-6">
          <p className="text-destructive text-sm">{error}</p>
          <div className="flex flex-wrap gap-2">
            {job && (
              <Button
                variant="outline"
                onClick={() => void action('check')}
                disabled={busy}
              >
                상태 다시 확인
              </Button>
            )}
            <Button asChild variant="outline">
              <a href="/login">로그인 화면</a>
            </Button>
          </div>
        </div>
      )}
      {!job ? (
        <section className="bg-card rounded-lg border p-6">
          <h2 className="text-lg font-semibold">첫 분석을 시작하세요</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            검색어와 지역을 선택하면 분석 상태와 결과가 여기에 표시됩니다.
          </p>
        </section>
      ) : (
        <section className="bg-card space-y-6 rounded-lg border p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <h2 className="text-lg font-semibold break-words">
                {job.query.keyword}
              </h2>
              <p aria-live="polite" className="text-muted-foreground text-sm">
                {statusLabels[job.state]}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-11"
                disabled={busy}
                onClick={() => void action('refresh')}
              >
                다시 분석
              </Button>
              <Button
                variant="destructive"
                className="h-11"
                disabled={busy}
                onClick={() => void action('delete')}
              >
                삭제
              </Button>
            </div>
          </div>
          {failure && (
            <p role="alert" className="text-destructive text-sm">
              {failureLabels[failure]}
            </p>
          )}
          {!terminal && (
            <p className="text-muted-foreground text-sm">
              결과가 준비되면 자동으로 표시됩니다.
            </p>
          )}
          {job.state === 'SUCCEEDED' && job.points.length > 0 && (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                샘플 데이터 · {job.points.length}주 · 실제 Google 검색 데이터가
                아닙니다.
              </p>
              <div className="h-72" aria-label="주간 검색 관심도 차트">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={job.points.map(point => ({ ...point }))}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      minTickGap={32}
                    />
                    <YAxis domain={[0, 100]} width={40} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="검색 관심도"
                      stroke="var(--chart-1)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <details>
                <summary className="focus-visible:ring-ring cursor-pointer rounded-md text-sm focus-visible:ring-2">
                  주간 데이터 표 보기
                </summary>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">주간 샘플 검색 관심도</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="p-2">
                          주 시작일
                        </th>
                        <th scope="col" className="p-2">
                          관심도
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.points.map(point => (
                        <tr key={point.date} className="border-t">
                          <td className="p-2">{point.date}</td>
                          <td className="p-2">{point.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
