import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import type { PriceDataPoint, TrendsDataPoint, Metrics } from '@/types/database'

interface GenerateExcelParams {
  ticker: string
  priceData: PriceDataPoint[]
  trendsData: TrendsDataPoint[]
  ma13Values: (number | null)[]
  metrics: Metrics
}

/**
 * 종목 데이터를 xlsx 파일로 생성하고 다운로드합니다.
 * 3개 시트: "주가 데이터", "트렌드 데이터", "지표 요약"
 */
export function generateExcelFile({
  ticker,
  priceData,
  trendsData,
  ma13Values,
  metrics,
}: GenerateExcelParams): void {
  // 데이터 검증
  if (!priceData || priceData.length === 0) {
    throw new Error('주가 데이터가 없습니다.')
  }

  // 1. 주가 데이터 시트
  const priceSheetData = [
    ['일자', '종가 ($)', '13주 MA ($)'],
    ...priceData.map((item, idx) => [
      item.date,
      item.close,
      ma13Values[idx] ?? '',
    ]),
  ]

  // 2. 트렌드 데이터 시트
  const trendsSheetData = [
    ['일자', 'Google Trends (0-100)'],
    ...trendsData.map(item => [item.date, item.value]),
  ]

  // 3. 지표 요약 시트
  const metricsSheetData = [
    ['지표', '값'],
    ['현재 종가', `$${metrics.currentPrice.toFixed(2)}`],
    ['13주 이동평균', `$${metrics.ma13.toFixed(2)}`],
    ['전년도 대비 (%)', `${metrics.yoyChange.toFixed(2)}%`],
    ['52주 최고가', `$${metrics.week52High.toFixed(2)}`],
    ['52주 최저가', `$${metrics.week52Low.toFixed(2)}`],
  ]

  // 워크북 생성
  const workbook = XLSX.utils.book_new()

  // 각 시트 추가
  const priceSheet = XLSX.utils.aoa_to_sheet(priceSheetData)
  const trendsSheet = XLSX.utils.aoa_to_sheet(trendsSheetData)
  const metricsSheet = XLSX.utils.aoa_to_sheet(metricsSheetData)

  // 열 너비 설정
  priceSheet['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }]
  trendsSheet['!cols'] = [{ wch: 12 }, { wch: 20 }]
  metricsSheet['!cols'] = [{ wch: 15 }, { wch: 20 }]

  XLSX.utils.book_append_sheet(workbook, priceSheet, '주가 데이터')
  XLSX.utils.book_append_sheet(workbook, trendsSheet, '트렌드 데이터')
  XLSX.utils.book_append_sheet(workbook, metricsSheet, '지표 요약')

  // 파일명: {ticker}_StockInsight_{YYYYMMDD}.xlsx
  const filename = `${ticker}_StockInsight_${format(new Date(), 'yyyyMMdd')}.xlsx`

  // 파일 다운로드
  XLSX.writeFile(workbook, filename)
}

interface TableExcelRow {
  date: string
  close: number
  trends: number
  ma13: number | null
  yoy: number
}

/**
 * 테이블 데이터를 xlsx 파일로 생성하고 다운로드합니다.
 * 단일 시트: 일자, 종가, 검색 관심도, 13주 MA, YoY
 */
export function generateTableExcelFile(
  ticker: string,
  tableData: TableExcelRow[]
): void {
  // 데이터 검증
  if (!tableData || tableData.length === 0) {
    throw new Error('테이블 데이터가 없습니다.')
  }

  // 테이블 데이터 시트
  const tableSheetData = [
    ['일자', '종가 ($)', '검색 관심도 (0-100)', '13주 MA ($)', 'YoY (%)'],
    ...tableData.map(row => [
      row.date,
      row.close.toFixed(2),
      row.trends,
      row.ma13 !== null ? row.ma13.toFixed(2) : '',
      row.yoy.toFixed(2),
    ]),
  ]

  // 워크북 생성
  const workbook = XLSX.utils.book_new()
  const tableSheet = XLSX.utils.aoa_to_sheet(tableSheetData)

  // 열 너비 설정
  tableSheet['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
  ]

  XLSX.utils.book_append_sheet(workbook, tableSheet, '데이터')

  // 파일명: {ticker}_Table_{YYYYMMDD}.xlsx
  const filename = `${ticker}_Table_${format(new Date(), 'yyyyMMdd')}.xlsx`

  // 파일 다운로드
  XLSX.writeFile(workbook, filename)
}
