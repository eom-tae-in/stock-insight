import type { SupabaseClient } from '@supabase/supabase-js'
import type { KeywordRepository } from './repositories/keyword-repository'
import type { AnalysisRepository } from './repositories/analysis-repository'
import type { OverlayRepository } from './repositories/overlay-repository'
import { SupabaseKeywordRepository } from './repositories/supabase-keyword-repository'
import { SupabaseAnalysisRepository } from './repositories/supabase-analysis-repository'
import { SupabaseOverlayRepository } from './repositories/supabase-overlay-repository'
import type { Period, Region, SearchType } from '@/types/database'

type KeywordCreateInput = {
  keyword?: string
  region?: Region
  search_type?: SearchType
  chartData?: Array<{
    date: string
    trendsValue: number
    ma13Value: number | null
    yoyValue: number | null
  }>
  overlays?: Array<{
    ticker: string
    companyName: string
    overlayData: Array<{
      date: string
      normalizedPrice: number
      rawPrice: number
    }>
  }>
}

export function createKeywordCreationService(
  keywordRepository: KeywordRepository,
  analysisRepository: AnalysisRepository,
  overlayRepository: OverlayRepository
) {
  return {
    async createKeywordWithAnalysis(userId: string, input: KeywordCreateInput) {
      const keyword = await keywordRepository.upsert(
        userId,
        input.keyword ?? ''
      )
      const region: Region = input.region ?? 'GLOBAL'
      const searchType: SearchType = input.search_type ?? 'WEB'
      const period: Period = '5Y'
      let analysisId: string | null = null

      if (input.chartData && input.chartData.length > 0) {
        analysisId = await analysisRepository.create({
          keyword_id: keyword.id,
          region,
          period,
          search_type: searchType,
          trends_data: input.chartData.map(point => ({
            date: point.date,
            value: point.trendsValue,
            ma13Value: point.ma13Value,
            yoyValue: point.yoyValue,
          })),
          ma13_data: input.chartData.at(-1)?.ma13Value ?? undefined,
          yoy_data: input.chartData.at(-1)?.yoyValue ?? undefined,
        })
      }

      if (input.overlays && input.overlays.length > 0) {
        analysisId ??= await analysisRepository.create({
          keyword_id: keyword.id,
          region,
          period,
          search_type: searchType,
          trends_data: [],
        })

        for (let i = 0; i < input.overlays.length; i++) {
          const overlay = input.overlays[i]
          const overlayId = await overlayRepository.create({
            analysisId,
            ticker: overlay.ticker.trim().toUpperCase(),
            companyName: overlay.companyName,
            displayOrder: i,
          })

          if (overlay.overlayData.length > 0) {
            await overlayRepository.insertTimeseries(
              overlay.overlayData.map(point => ({
                overlay_id: overlayId,
                date: point.date,
                normalized_price: point.normalizedPrice,
                raw_price: point.rawPrice,
              }))
            )
          }
        }
      }

      return {
        id: keyword.id,
        keyword: keyword.keyword,
      }
    },
  }
}

function createSupabaseKeywordCreationService(supabase: SupabaseClient) {
  return createKeywordCreationService(
    new SupabaseKeywordRepository(supabase),
    new SupabaseAnalysisRepository(supabase),
    new SupabaseOverlayRepository(supabase)
  )
}

export function createKeywordWithAnalysis(
  supabase: SupabaseClient,
  userId: string,
  input: KeywordCreateInput
) {
  return createSupabaseKeywordCreationService(
    supabase
  ).createKeywordWithAnalysis(userId, input)
}
