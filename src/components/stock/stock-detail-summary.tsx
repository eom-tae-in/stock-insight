import { addDays, format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { TickerLogo } from '@/components/shared/ticker-logo'
import { ChangeText } from '@/components/shared/change-badge'
import { MetricTile } from '@/components/shared/metric-tile'
import { formatDisplayPrice, formatVolume } from '@/lib/format/display'
import { stockDetailSummary } from '@/lib/stock/detail-summary'
import type { SearchRecord } from '@/types'

function shortDate(value: string | null, weekEnd = false) {
  if (!value) return '—'
  const parsed = parseISO(value)
  if (!Number.isFinite(parsed.getTime())) return '—'
  return format(weekEnd ? addDays(parsed, 4) : parsed, 'MM.dd')
}

export function StockDetailSummary({
  record,
}: {
  readonly record: SearchRecord
}) {
  const summary = stockDetailSummary(record.price_data)
  const currency = record.currency ?? record.ticker
  const price = (value: number | null) => formatDisplayPrice(value, currency)
  const difference = summary.difference
  const signedDifference =
    difference === null || !Number.isFinite(difference)
      ? '—'
      : `${difference < 0 ? '−' : '+'}${Math.abs(difference).toFixed(2)}`
  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <TickerLogo ticker={record.ticker} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl leading-8 font-bold">{record.ticker}</h1>
            <Badge variant="neutral" className="rounded-full">
              {record.currency ?? '통화 미지정'}
            </Badge>
            <Badge variant="brand" className="rounded-full">
              <span
                aria-hidden
                className="bg-brand-text size-1.5 rounded-full"
              />
              관심 종목
            </Badge>
          </div>
          <p className="text-tertiary mt-1 text-[13px] leading-5 break-words">
            {record.company_name}
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-x-3.5 gap-y-1">
            <p className="text-[32px] leading-10 font-semibold tracking-[-0.025em] tabular-nums md:text-[40px] md:leading-[48px]">
              {price(summary.current)}
            </p>
            <div className="pb-1.5">
              <p className="text-text-secondary text-base leading-6 tabular-nums">
                <span
                  className={
                    summary.change === null || summary.change === 0
                      ? undefined
                      : summary.change > 0
                        ? 'text-up'
                        : 'text-down'
                  }
                >
                  {signedDifference}
                </span>{' '}
                (
                <ChangeText
                  value={summary.change}
                  className="text-base leading-6"
                />
                )
              </p>
              <p className="text-tertiary text-xs">
                전주 대비 · {shortDate(summary.date, true)} 주간 종가
              </p>
            </div>
          </div>
          <p className="text-tertiary mt-2 text-xs">
            마지막 최신화:{' '}
            <time dateTime={record.last_updated_at ?? record.searched_at}>
              {(record.last_updated_at ?? record.searched_at)
                .slice(0, 10)
                .replaceAll('-', '.')}
            </time>
          </p>
        </div>
      </header>
      <section
        aria-label="종목 핵심 지표"
        className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5 [&>div]:min-w-0"
      >
        <MetricTile
          label="13주 이동평균"
          value={price(summary.ma13)}
          change={
            <ChangeText
              value={summary.deviation}
              missingReason="13주 이상의 종가가 필요해요."
            />
          }
          caption="종가와의 괴리"
          info="최근 13주의 평균 종가예요. 괴리는 최근 종가를 이 평균과 비교한 변화율이에요."
        />
        <MetricTile
          label="52주 YoY (13주 MA 기준)"
          value={
            <ChangeText
              value={summary.yoy}
              className="text-xl leading-7 font-semibold"
              missingReason="65주 이상의 종가가 필요해요."
            />
          }
          caption="전년 동기 13주 MA 대비"
          info="최근 13주 평균 종가를 52주 전 같은 시점의 13주 평균과 비교한 변화율이에요."
        />
        <MetricTile
          label="주간 고가 · 저가"
          value={
            <span className="inline-flex flex-wrap gap-x-1 text-base xl:text-lg">
              {price(summary.high)} · {price(summary.low)}
            </span>
          }
          caption={`주간 변동폭 ${summary.rangePercent === null ? '—' : `${summary.rangePercent.toFixed(2)}%`}`}
          info="저장된 최근 완료 주의 고가와 저가예요. 변동폭은 저가 대비 고가의 차이예요."
        />
        <MetricTile
          label="5년 최고 종가"
          value={price(summary.highestClose)}
          change={<ChangeText value={summary.highestChange} />}
          caption={`${shortDate(summary.highestDate, true)} 고점 대비`}
          info="저장된 주간 데이터 중 가장 높은 종가예요. 최대 5년이며 수집된 기간이 짧으면 그 기간만 비교해요."
        />
        <MetricTile
          label="주간 거래량"
          value={formatVolume(summary.volume)}
          change={<ChangeText value={summary.volumeChange} />}
          caption="전주 대비"
          info="최근 완료 주의 거래량이에요. 이전 주 거래량이 없거나 0이면 변화율은 표시하지 않아요."
        />
      </section>
    </div>
  )
}
