import { addDays, format, parseISO } from 'date-fns'
import type { SearchRecord, KeywordRecord } from '@/types/database'
import { getLastCompletedWeekStart } from '@/lib/utils/week-sync'
import { formatWeek } from '@/lib/format/display'

export type AccountProfile = { readonly name: string; readonly email?: string }
export type ShellStock = {
  readonly id: string
  readonly ticker: string
  readonly change: number | null
}
export type ShellData = {
  readonly stocks: readonly ShellStock[]
  readonly keywords: readonly { readonly id: string; readonly label: string }[]
  readonly isAdmin: boolean
  readonly week: string
  readonly weekRange: string
  readonly nextWeek: string
  readonly staleCount: number
}

export function toShellStock(record: SearchRecord): ShellStock {
  const current = record.current_price
  const previous = record.previous_close
  return {
    id: record.id,
    ticker: record.ticker,
    change:
      current !== undefined &&
      previous !== undefined &&
      previous > 0 &&
      Number.isFinite(current) &&
      Number.isFinite(previous)
        ? ((current - previous) / previous) * 100
        : null,
  }
}

export function createShellData(
  stocks: readonly SearchRecord[],
  keywords: readonly KeywordRecord[],
  isAdmin: boolean,
  now: Date
): ShellData {
  const week = getLastCompletedWeekStart(now)
  const stale = (value: string) =>
    now.getTime() - parseISO(value).getTime() >= 14 * 86400000
  return {
    stocks: stocks.map(toShellStock),
    keywords: keywords.map(item => ({ id: item.id, label: item.keyword })),
    isAdmin,
    week: formatWeek(format(week, 'yyyy-MM-dd')),
    weekRange: `${format(week, 'MM.dd')} – ${format(addDays(week, 4), 'MM.dd')}`,
    nextWeek: `${format(addDays(week, 14), 'MM.dd')}(월) 이후`,
    staleCount:
      stocks.filter(item => stale(item.last_updated_at ?? item.searched_at))
        .length + keywords.filter(item => stale(item.updated_at)).length,
  }
}

export function shellRoute(path: string, data: ShellData) {
  const stock = data.stocks.find(
    item =>
      path === `/stock-analysis/${item.id}` ||
      path.startsWith(`/stock-analysis/${item.id}/`)
  )
  const keyword = data.keywords.find(
    item =>
      path === `/keywords/${item.id}` ||
      path.startsWith(`/keywords/${item.id}/`)
  )
  if (stock)
    return {
      parent: '종목 분석',
      href: '/stock-analysis',
      title: stock.ticker,
      detail: true,
    }
  if (keyword)
    return {
      parent: '키워드 분석',
      href: '/keyword-analysis',
      title: keyword.label,
      detail: true,
    }
  if (path.startsWith('/stock-analysis/'))
    return {
      parent: '종목 분석',
      href: '/stock-analysis',
      title: path.includes('/table') ? '주간 데이터' : '종목 조회 결과',
      detail: true,
    }
  if (path.startsWith('/keyword-analysis/') || path.startsWith('/keywords/'))
    return {
      parent: '키워드 분석',
      href: '/keyword-analysis',
      title: path.endsWith('/new') ? '새 분석' : '키워드 조회 결과',
      detail: true,
    }
  const title =
    path === '/stock-analysis'
      ? '종목 분석'
      : path === '/keyword-analysis'
        ? '키워드 분석'
        : path === '/admin'
          ? '운영 대시보드'
          : path === '/search'
            ? '종목 조회'
            : '홈'
  return { parent: 'StockInsight', href: '/', title, detail: false }
}
