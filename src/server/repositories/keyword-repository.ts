import type { KeywordRecord } from '@/types/database'

export interface KeywordRepository {
  findManyByUserId(userId: string): Promise<KeywordRecord[]>
  findById(userId: string, keywordId: string): Promise<KeywordRecord | null>
  upsert(userId: string, keyword: string): Promise<KeywordRecord>
  updateName(
    userId: string,
    keywordId: string,
    keyword: string
  ): Promise<KeywordRecord | null>
  reorder(userId: string, orderedIds: string[]): Promise<void>
  deleteById(userId: string, keywordId: string): Promise<boolean>
}
