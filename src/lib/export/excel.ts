import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { formatPrice, getCurrencySymbol } from '@/lib/utils/currency'
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

  const currencySymbol = getCurrencySymbol(ticker)

  // 1. 주가 데이터 시트
  const priceSheetData = [
    ['일자', `종가 (${currencySymbol})`, `13주 MA (${currencySymbol})`],
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
    ['현재 종가', formatPrice(metrics.currentPrice, ticker)],
    ['13주 이동평균', formatPrice(metrics.ma13, ticker)],
    ['전년도 대비 (%)', `${metrics.yoyChange.toFixed(2)}%`],
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
 * 단일 시트: 일자, 종가, 13주 MA, YoY
 */
export function generateTableExcelFile(
  ticker: string,
  tableData: TableExcelRow[]
): void {
  // 데이터 검증
  if (!tableData || tableData.length === 0) {
    throw new Error('테이블 데이터가 없습니다.')
  }

  const currencySymbol = getCurrencySymbol(ticker)

  // 테이블 데이터 시트
  const tableSheetData = [
    [
      '일자',
      `종가 (${currencySymbol})`,
      `13주 MA (${currencySymbol})`,
      'YoY (%)',
    ],
    ...tableData.map(row => [
      row.date,
      formatPrice(row.close, ticker),
      row.ma13 !== null ? formatPrice(row.ma13, ticker) : '',
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
    { wch: 14 },
    { wch: 12 },
  ]

  XLSX.utils.book_append_sheet(workbook, tableSheet, '데이터')

  // 파일명: {ticker}_Table_{YYYYMMDD}.xlsx
  const filename = `${ticker}_Table_${format(new Date(), 'yyyyMMdd')}.xlsx`

  // 파일 다운로드
  XLSX.writeFile(workbook, filename)
}

interface KeywordAnalysisExcelParams {
  keyword: string
  region: string
  period: string
  searchType: string
  trendsData: TrendsDataPoint[]
  ma13Data?: number | null
  yoyData?: number | null
  overlayData?: Array<{
    ticker: string
    companyName: string
  }>
}

/**
 * 키워드 분석 데이터를 xlsx 파일로 생성하고 다운로드합니다.
 * 시트: "트렌드 데이터", "지표 요약", (선택) "종목 목록"
 */
export function generateKeywordAnalysisExcelFile({
  keyword,
  region,
  period,
  searchType,
  trendsData,
  ma13Data,
  yoyData,
  overlayData,
}: KeywordAnalysisExcelParams): void {
  // 데이터 검증
  if (!trendsData || trendsData.length === 0) {
    throw new Error('트렌드 데이터가 없습니다.')
  }

  // 1. 트렌드 데이터 시트
  const trendsSheetData = [
    ['일자', '관심도 (0-100)', '13주 MA', 'YoY (%)'],
    ...trendsData.map(item => [
      item.date,
      item.value,
      item.ma13Value !== null ? item.ma13Value.toFixed(2) : '',
      item.yoyValue !== null ? item.yoyValue.toFixed(2) : '',
    ]),
  ]

  // 2. 지표 요약 시트
  const metricsSheetData = [
    ['항목', '값'],
    ['키워드', keyword],
    ['지역', region],
    ['기간', period],
    ['검색 타입', searchType],
    ['현재 관심도', trendsData[trendsData.length - 1]?.value ?? ''],
    ['13주 MA', ma13Data !== null && ma13Data !== undefined ? ma13Data.toFixed(2) : ''],
    ['YoY (%)', yoyData !== null && yoyData !== undefined ? yoyData.toFixed(2) : ''],
  ]

  // 워크북 생성
  const workbook = XLSX.utils.book_new()

  // 트렌드 데이터 시트
  const trendsSheet = XLSX.utils.aoa_to_sheet(trendsSheetData)
  trendsSheet['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }]

  // 지표 요약 시트
  const metricsSheet = XLSX.utils.aoa_to_sheet(metricsSheetData)
  metricsSheet['!cols'] = [{ wch: 15 }, { wch: 30 }]

  XLSX.utils.book_append_sheet(workbook, trendsSheet, '트렌드 데이터')
  XLSX.utils.book_append_sheet(workbook, metricsSheet, '지표 요약')

  // 종목 목록 시트 (선택)
  if (overlayData && overlayData.length > 0) {
    const overlaySheetData = [
      ['Ticker', '회사명'],
      ...overlayData.map(item => [item.ticker, item.companyName]),
    ]
    const overlaySheet = XLSX.utils.aoa_to_sheet(overlaySheetData)
    overlaySheet['!cols'] = [{ wch: 12 }, { wch: 25 }]
    XLSX.utils.book_append_sheet(workbook, overlaySheet, '오버레이 종목')
  }

  // 파일명: {keyword}_{region}_{period}_{YYYYMMDD}.xlsx
  const filename = `${keyword}_${region}_${period}_${format(new Date(), 'yyyyMMdd')}.xlsx`

  // 파일 다운로드
  XLSX.writeFile(workbook, filename)
}
