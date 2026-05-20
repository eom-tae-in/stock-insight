import type {
  KeywordAnalysisOverlay,
  Period,
  Region,
  SearchType,
} from '@/types/database'

export type AnalysisFilterSnapshot = {
  region: Region
  period: Period
  search_type: SearchType
}

export type OverlayTimeseriesRecord = {
  overlay_id: string
  date: string
  raw_price: number
  normalized_price: number
}

export type OverlayOrderRecord = {
  id: string
  display_order: number
}

export type OverlayTicker = {
  id: string
  ticker: string
}

export interface OverlayRepository {
  findOwnedAnalysisFilters(
    userId: string,
    analysisId: string
  ): Promise<AnalysisFilterSnapshot | null>

  findManyByAnalysisId(
    userId: string,
    analysisId: string
  ): Promise<KeywordAnalysisOverlay[]>

  create(input: {
    analysisId: string
    ticker: string
    companyName: string
    displayOrder?: number
  }): Promise<string>

  insertTimeseries(records: OverlayTimeseriesRecord[]): Promise<void>

  updateOrder(analysisId: string, overlays: OverlayOrderRecord[]): Promise<void>

  deleteById(analysisId: string, overlayId: string): Promise<boolean>

  findTickerById(
    analysisId: string,
    overlayId: string
  ): Promise<OverlayTicker | null>

  refreshTimeseries(input: {
    analysisId: string
    overlayId: string
    records: OverlayTimeseriesRecord[]
    pruneBeforeDate?: string
  }): Promise<void>
}
