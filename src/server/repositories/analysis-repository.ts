import type {
  KeywordAnalysis,
  Period,
  Region,
  SearchType,
} from '@/types/database'

export type AnalysisCreateData = Omit<
  KeywordAnalysis,
  'id' | 'created_at' | 'updated_at'
>

export type AnalysisUpdateData = {
  trends_data?: KeywordAnalysis['trends_data']
  ma13_data?: number | null
  yoy_data?: number | null
}

export type OwnedAnalysisWithKeyword = {
  analysis: KeywordAnalysis
  keyword: string
}

export interface AnalysisRepository {
  findByFilters(
    userId: string,
    keywordId: string,
    region: Region,
    period: Period,
    searchType: SearchType
  ): Promise<KeywordAnalysis | null>

  findManyByKeywordId(
    userId: string,
    keywordId: string
  ): Promise<KeywordAnalysis[]>

  findOwnedById(
    userId: string,
    analysisId: string
  ): Promise<KeywordAnalysis | null>

  findOwnedWithKeyword(
    userId: string,
    analysisId: string
  ): Promise<OwnedAnalysisWithKeyword | null>

  getOwnedKeywordName(userId: string, keywordId: string): Promise<string | null>

  create(data: AnalysisCreateData): Promise<string>

  update(analysisId: string, data: AnalysisUpdateData): Promise<boolean>

  deleteById(analysisId: string): Promise<boolean>

  reorder(userId: string, orderedIds: string[]): Promise<void>
}
