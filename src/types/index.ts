/**
 * 타입 중앙 내보내기
 * 모든 타입을 한 곳에서 import할 수 있습니다
 */

// API 타입
export type {
  YahooFinancePriceData,
  YahooFinanceQuoteSummary,
  YahooFinanceHistoricalData,
  GoogleTrendsData,
  APIError,
} from './api'

// 데이터베이스 타입
export type {
  PriceDataPoint,
  TrendsDataPoint,
  SearchRecord,
  SearchRecordRaw,
  Metrics,
  CalculatedMetrics,
  KeywordRecord,
  KeywordStockOverlay,
  KeywordTrendsMetrics,
} from './database'

// UI 타입
export type {
  StockCardProps,
  MetricsCardProps,
  StockDetailProps,
  PriceChartProps,
  TrendsChartProps,
  ComparisonChartProps,
  SearchFormProps,
  ProgressState,
  Downloadable,
  UnifiedChartProps,
  CustomTable,
  CustomTableBuilderProps,
  CustomChart,
  CustomChartBuilderProps,
} from './ui'

// 공통 타입
export type {
  ApiResponse,
  ApiErrorResponse,
  ApiResult,
  PaginatedResponse,
  AsyncStatus,
  AsyncState,
} from './common'
