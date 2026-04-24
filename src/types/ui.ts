import { ReactNode } from 'react'
import {
  SearchRecord,
  Metrics,
  PriceDataPoint,
  TrendsDataPoint,
} from './database'

/**
 * 대시보드 종목 카드 Props
 */
export interface StockCardProps {
  id: string
  ticker: string
  companyName: string
  currency?: string
  weeklyOpen: number // 지난주 시가
  weeklyHigh: number // 지난주 고가
  weeklyLow: number // 지난주 저가
  currentPrice: number // 지난주 종가
  previousClose: number // 그 전주 종가
  ma13: number // 최근 13주 평균
  yoyChange: number // 52주 대비 변화율 (%)
  lastUpdatedAt: string // ISO 8601 형식
  onRefresh?: () => Promise<void>
  onDelete?: () => Promise<void>
  isLoading?: boolean
}

/**
 * 지표 요약 카드 Props
 */
export interface MetricsCardProps {
  label: string
  value: string | number
  unit?: string
  isPositive?: boolean // 색상 표시용 (상승/하락)
  icon?: ReactNode
}

/**
 * 지표 요약 컴포넌트 Props
 */
export interface MetricsSummaryProps {
  metrics: import('./database').Metrics
  lastUpdatedAt?: string
}

/**
 * 종목 상세 페이지 Props
 */
export interface StockDetailProps {
  searchRecord: SearchRecord
  metrics: Metrics
}

/**
 * 라인 차트 Props (주가 + MA13)
 */
export interface PriceChartProps {
  priceData: PriceDataPoint[]
  ma13?: (number | null)[]
  onDownload?: () => Promise<void>
}

/**
 * 영역 차트 Props (Google Trends)
 */
export interface TrendsChartProps {
  trendsData: TrendsDataPoint[]
  onDownload?: () => Promise<void>
}

/**
 * 이중 Y축 비교 차트 Props
 */
export interface ComparisonChartProps {
  priceData: PriceDataPoint[]
  trendsData: TrendsDataPoint[]
  onDownload?: () => Promise<void>
}

/**
 * 폼 입력 Props
 */
export interface SearchFormProps {
  onSubmit: (ticker: string) => Promise<void>
  isLoading?: boolean
  error?: string
}

/**
 * 로딩 진행 상태 Props
 */
export interface ProgressState {
  stage:
    | 'idle'
    | 'fetching-price'
    | 'fetching-trends'
    | 'calculating'
    | 'saving'
    | 'complete'
    | 'error'
  message: string
  error?: string
}

/**
 * 다운로드 가능한 컴포넌트의 기본 Props
 */
export interface Downloadable {
  onDownload?: () => Promise<void>
  isDownloading?: boolean
}

/**
 * 통합 차트 Props (가격 + 13주 이동평균 기준 52주 YoY를 하나로)
 */
export interface UnifiedChartProps {
  ticker?: string
  currency?: string
  priceData: PriceDataPoint[]
  trendsData?: TrendsDataPoint[]
  ma13?: (number | null)[]
  metrics: Metrics
  onDownload?: () => Promise<void>
}

/**
 * 커스텀 테이블 설정
 */
export interface CustomTable {
  id: string // crypto.randomUUID()
  name: string // 사용자가 지정한 테이블 이름
  columns: string[] // 선택된 컬럼 키 배열
  createdAt: string // ISO 8601 타임스탬프
}

/**
 * 커스텀 테이블 빌더 Props
 */
export interface CustomTableBuilderProps {
  searchId: string
  priceData: PriceDataPoint[]
  trendsData?: TrendsDataPoint[]
  ma13?: (number | null)[]
  onTableCreated?: (table: CustomTable) => void
}

/**
 * 커스텀 차트 설정
 */
export interface CustomChart {
  id: string // crypto.randomUUID()
  name: string // 사용자가 지정한 차트 이름
  series: string[] // 선택된 시리즈 키 배열
  timeRange: number // 표시할 주 수 (13, 26, 52 등)
  createdAt: string // ISO 8601 타임스탐프
}

/**
 * 커스텀 차트 빌더 Props
 */
export interface CustomChartBuilderProps {
  searchId: string
  onChartCreated?: (chart: CustomChart) => void
}
