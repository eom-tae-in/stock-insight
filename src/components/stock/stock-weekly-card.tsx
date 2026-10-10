'use client'

import { useState } from 'react'
import Link from 'next/link'
import { addDays, format, startOfISOWeek, parseISO } from 'date-fns'
import { FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { ChangeText } from '@/components/shared/change-badge'
import { calculateMA13, calculateWeeklyYoY } from '@/lib/calculations'
import {
  formatDisplayPrice,
  formatVolume,
  formatWeek,
} from '@/lib/format/display'
import { generateTableExcelFile } from '@/lib/export'
import type { SearchRecord } from '@/types'

export function StockWeeklyCard({ record }: { readonly record: SearchRecord }) {
  const [exportError, setExportError] = useState<string | null>(null)
  const ma13 = calculateMA13(record.price_data)
  const yoy = calculateWeeklyYoY(record.price_data)
  const rows = record.price_data.map((point, index) => {
    const previous = record.price_data[index - 1]?.close
    return {
      ...point,
      ma13: ma13[index] ?? null,
      yoy: yoy[index] ?? null,
      change:
        previous === undefined || previous === 0
          ? null
          : ((point.close - previous) / previous) * 100,
    }
  })
  const recent = rows.slice(-6).reverse()
  const currency = record.currency || record.ticker
  function downloadExcel() {
    setExportError(null)
    try {
      generateTableExcelFile(
        record.ticker,
        rows.map(row => ({
          date: row.date,
          close: row.close,
          trends: 0,
          ma13: row.ma13,
          yoy: row.yoy,
        }))
      )
    } catch (error) {
      if (!(error instanceof Error)) throw error
      setExportError(error.message)
    }
  }
  return (
    <section
      id="weekly-data"
      aria-label="주간 데이터"
      className="bg-card overflow-hidden rounded-lg border"
    >
      <header className="flex flex-wrap items-center gap-3 px-5 py-4">
        <div className="min-w-0 basis-full space-y-0.5 sm:flex-1 sm:basis-auto">
          <div className="flex items-center gap-2">
            <h2 className="text-base leading-6 font-semibold">주간 데이터</h2>
            <span className="text-tertiary text-[13px] tabular-nums">
              {rows.length}주
            </span>
          </div>
          <p className="text-tertiary text-xs leading-4 break-keep">
            최근 {recent.length}주 · 전체 보기와 Excel에는 저장된 전체 주간
            데이터가 담겨요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={rows.length === 0}
            aria-label="전체 주간 데이터를 Excel로 다운로드"
            onClick={downloadExcel}
          >
            <FileSpreadsheet aria-hidden />
            Excel
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/stock-analysis/${record.id}/table`}>전체 보기</Link>
          </Button>
        </div>
      </header>
      {exportError && (
        <p role="alert" className="text-danger px-5 pb-4 text-sm">
          Excel 다운로드에 실패했어요. {exportError} 다시 시도해주세요.
        </p>
      )}
      {recent.length === 0 ? (
        <p className="text-text-secondary px-5 pb-5 text-sm">
          저장된 주간 데이터가 없어요. 종목을 최신화한 뒤 다시 확인해주세요.
        </p>
      ) : (
        <div
          role="region"
          aria-label="최근 주간 데이터 표, 가로로 스크롤할 수 있어요"
          tabIndex={0}
          className="focus-visible:ring-ring overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-inset"
        >
          <table
            aria-label="최근 6주 주가"
            className="w-full min-w-[1040px] text-[13px] leading-5 whitespace-nowrap tabular-nums"
          >
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="w-44">
                  주차
                </TableHead>
                {[
                  '시가',
                  '고가',
                  '저가',
                  '종가',
                  '등락률',
                  '거래량',
                  '13주 MA',
                  '52주 YoY',
                ].map(label => (
                  <TableHead key={label} scope="col" className="text-right">
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map(row => {
                const monday = startOfISOWeek(parseISO(row.date))
                return (
                  <TableRow key={row.date}>
                    <TableCell>
                      <time
                        dateTime={row.date}
                        aria-label={formatWeek(row.date)}
                        className="text-text-secondary flex items-center gap-2"
                      >
                        <span className="text-tertiary text-xs">
                          {formatWeek(row.date, true)}
                        </span>
                        {format(monday, 'MM.dd')} –{' '}
                        {format(addDays(monday, 4), 'MM.dd')}
                      </time>
                    </TableCell>
                    {[row.open, row.high, row.low, row.close].map(
                      (value, index) => (
                        <TableCell key={index} className="text-right">
                          {formatDisplayPrice(value ?? null, currency)}
                        </TableCell>
                      )
                    )}
                    <TableCell className="text-right">
                      <ChangeText value={row.change} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatVolume(row.volume ?? null)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDisplayPrice(row.ma13, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ChangeText value={row.yoy} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </table>
        </div>
      )}
    </section>
  )
}
