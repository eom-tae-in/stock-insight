'use client'

import { useHydrated } from '@/hooks/use-hydrated'
import Link from 'next/link'
import { MoreHorizontal, RefreshCw } from 'lucide-react'
import type { ReactNode, ComponentProps } from 'react'
import type { SearchRecord } from '@/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TickerLogo } from '@/components/shared/ticker-logo'
import { Sparkline } from '@/components/shared/sparkline'
import { ChangeBadge, ChangeText } from '@/components/shared/change-badge'
import { formatDisplayPrice, formatInterest } from '@/lib/format/display'
import { stockListMetrics, type LinkedInterest } from '@/lib/stock/list-summary'
import { cn } from '@/lib/utils'

export const stockRowLayout =
  'xl:grid xl:grid-cols-[minmax(100px,1fr)_96px_88px_88px_80px_140px_56px_44px] min-[90rem]:grid-cols-[minmax(100px,1fr)_96px_88px_88px_80px_140px_104px_56px_44px] xl:gap-3'

export function StockListHeader() {
  return (
    <thead className="hidden xl:block">
      <tr
        className={cn(
          stockRowLayout,
          'bg-surface-sunken text-tertiary border-border-subtle hidden h-10 items-center border-b px-4 text-xs xl:grid'
        )}
      >
        {[
          '종목',
          '종가',
          '전주 대비',
          '13주선 괴리',
          '52주 YoY',
          '연결 키워드 관심도',
          '1년 추이',
          '갱신',
          '작업',
        ].map((label, i) => (
          <th
            key={label}
            className={cn(
              'text-left font-medium',
              i !== 0 && i !== 5 && 'text-right',
              i === 6 && 'hidden min-[90rem]:block'
            )}
          >
            {label}
          </th>
        ))}
      </tr>
    </thead>
  )
}

export function StockListTable({ children }: { readonly children: ReactNode }) {
  return (
    <table
      aria-label="관심 종목"
      className="bg-card block w-full overflow-hidden rounded-lg border"
    >
      <StockListHeader />
      <tbody className="block">{children}</tbody>
    </table>
  )
}

export function StockListRow({
  record,
  rowProps,
  stale = false,
  interest,
  control,
  managing,
  selected,
  busy,
  onRefresh,
  onDelete,
}: {
  readonly stale?: boolean
  readonly rowProps?: Pick<ComponentProps<'tr'>, 'ref' | 'style'>
  readonly record: SearchRecord
  readonly interest?: LinkedInterest
  readonly control?: ReactNode
  readonly managing: boolean
  readonly selected: boolean
  readonly busy: boolean
  readonly onRefresh: () => void
  readonly onDelete: () => void
}) {
  const hydrated = useHydrated()
  const metrics = stockListMetrics(record)
  const currency = record.currency ?? record.ticker
  const updated = record.last_updated_at ?? record.searched_at
  const date = new Date(updated)
  const dateLabel = Number.isNaN(date.getTime())
    ? '—'
    : `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  const keyword = interest
    ? `${interest.keyword}${interest.count > 1 ? ` 외 ${interest.count - 1}개` : ''}`
    : '연결 없음'
  return (
    <tr
      {...rowProps}
      className={cn(
        stockRowLayout,
        'border-border-subtle relative flex min-h-16 items-center gap-2 border-b px-4 transition-colors last:border-b-0',
        selected ? 'bg-brand-subtle' : !managing && 'hover:bg-surface-raised'
      )}
    >
      <td className="flex min-w-0 flex-1 items-center gap-3">
        {control ?? <TickerLogo ticker={record.ticker} />}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm leading-5 font-semibold">
            {record.ticker}
          </h3>
          <p className="text-tertiary truncate text-xs leading-4">
            {record.company_name}
          </p>
        </div>
        {!managing && (
          <Link
            href={`/stock-analysis/${record.id}`}
            className="focus-visible:ring-ring absolute inset-0 rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label={`${record.ticker} 상세 보기`}
          />
        )}
      </td>
      <td className="order-2 w-[88px] shrink-0 text-right xl:order-none xl:w-auto">
        <span className="text-sm font-medium whitespace-nowrap tabular-nums">
          {formatDisplayPrice(metrics.current, currency)}
        </span>
        <div className="xl:hidden">
          <ChangeText value={metrics.change} />
        </div>
      </td>
      <td className="hidden text-right xl:block">
        <ChangeBadge value={metrics.change} />
      </td>
      <td className="hidden text-right xl:block">
        <ChangeText
          value={metrics.deviation}
          missingReason="13주 가격 데이터가 필요해요."
        />
      </td>
      <td className="hidden text-right xl:block">
        <ChangeText
          value={metrics.yoy}
          missingReason="13주 이동평균 기준 YoY는 65주 데이터가 필요해요."
        />
      </td>
      <td className="hidden min-w-0 xl:block">
        <p className="text-tertiary truncate text-xs">{keyword}</p>
        {interest && (
          <div className="flex items-center gap-1 text-sm tabular-nums">
            <span>{formatInterest(interest.value)}</span>
            <span className="text-brand-text text-xs">
              YoY{' '}
              <ChangeText
                className={cn(
                  'text-xs',
                  interest.yoy !== null &&
                    interest.yoy !== 0 &&
                    'text-brand-text'
                )}
                value={interest.yoy}
                kind="ratio"
              />
            </span>
          </div>
        )}
      </td>
      <td className="order-1 w-14 shrink-0 xl:hidden min-[90rem]:order-none min-[90rem]:block min-[90rem]:w-auto [&_svg]:h-6 [&_svg]:w-14 min-[90rem]:[&_svg]:h-8 min-[90rem]:[&_svg]:w-24">
        <Sparkline
          values={metrics.sparkline}
          label={`${record.ticker} 최근 1년 종가 추이`}
        />
      </td>
      <td className="text-tertiary hidden text-right text-xs tabular-nums xl:block">
        <time
          dateTime={updated}
          title={stale ? `${updated} · 2주 이상 갱신하지 않았어요.` : updated}
          className={stale ? 'text-warning' : undefined}
        >
          {dateLabel}
        </time>
      </td>
      <td className="relative z-10 order-3 shrink-0 xl:order-none">
        {hydrated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={`${record.ticker} 작업`}
                disabled={busy || managing}
              >
                <MoreHorizontal aria-hidden className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                {record.ticker} · {dateLabel} 갱신
              </DropdownMenuLabel>
              <div className="text-text-secondary space-y-2 px-2 py-2 text-xs">
                <p>
                  13주선 괴리 <ChangeText value={metrics.deviation} />
                </p>
                <p>
                  52주 YoY <ChangeText value={metrics.yoy} />
                </p>
                <p className="break-words">
                  연결 키워드: {keyword}
                  {interest &&
                    ` · 관심도 ${formatInterest(interest.value)}/100`}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onRefresh}>
                <RefreshCw aria-hidden className="size-4" />
                최신화
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDelete} className="text-danger">
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={`${record.ticker} 작업`}
            disabled
          >
            <MoreHorizontal aria-hidden className="size-4" />
          </Button>
        )}
        {busy && (
          <span
            className="text-text-secondary absolute inset-0 flex items-center justify-center"
            role="status"
            aria-label={`${record.ticker} 최신화 중`}
          >
            <RefreshCw
              aria-hidden
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          </span>
        )}
      </td>
    </tr>
  )
}
