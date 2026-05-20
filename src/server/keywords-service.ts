import type { SupabaseClient } from '@supabase/supabase-js'
import type { KeywordRecord } from '@/types/database'
import type { KeywordRepository } from './repositories/keyword-repository'
import { SupabaseKeywordRepository } from './repositories/supabase-keyword-repository'

export function createKeywordService(repository: KeywordRepository) {
  return {
    getKeywords(userId: string): Promise<KeywordRecord[]> {
      return repository.findManyByUserId(userId)
    },

    getKeyword(
      userId: string,
      keywordId: string
    ): Promise<KeywordRecord | null> {
      return repository.findById(userId, keywordId)
    },

    upsertKeyword(userId: string, keyword: string): Promise<KeywordRecord> {
      return repository.upsert(userId, keyword)
    },

    updateKeyword(
      userId: string,
      keywordId: string,
      keyword: string
    ): Promise<KeywordRecord | null> {
      return repository.updateName(userId, keywordId, keyword)
    },

    reorderKeywords(userId: string, orderedIds: string[]): Promise<void> {
      return repository.reorder(userId, orderedIds)
    },

    deleteKeyword(userId: string, keywordId: string): Promise<boolean> {
      return repository.deleteById(userId, keywordId)
    },
  }
}

function createSupabaseKeywordService(supabase: SupabaseClient) {
  return createKeywordService(new SupabaseKeywordRepository(supabase))
}

export async function getKeywords(
  supabase: SupabaseClient,
  userId: string
): Promise<KeywordRecord[]> {
  return createSupabaseKeywordService(supabase).getKeywords(userId)
}

export async function getKeyword(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string
): Promise<KeywordRecord | null> {
  return createSupabaseKeywordService(supabase).getKeyword(userId, keywordId)
}

export async function upsertKeyword(
  supabase: SupabaseClient,
  userId: string,
  keyword: string
): Promise<KeywordRecord> {
  return createSupabaseKeywordService(supabase).upsertKeyword(userId, keyword)
}

export async function updateKeyword(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string,
  keyword: string
): Promise<KeywordRecord | null> {
  return createSupabaseKeywordService(supabase).updateKeyword(
    userId,
    keywordId,
    keyword
  )
}

export async function reorderKeywords(
  supabase: SupabaseClient,
  userId: string,
  orderedIds: string[]
): Promise<void> {
  return createSupabaseKeywordService(supabase).reorderKeywords(
    userId,
    orderedIds
  )
}

export async function deleteKeyword(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string
): Promise<boolean> {
  return createSupabaseKeywordService(supabase).deleteKeyword(userId, keywordId)
}
