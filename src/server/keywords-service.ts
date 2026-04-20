import type { SupabaseClient } from '@supabase/supabase-js'
import type { KeywordRecord } from '@/types/database'
import { normalizeKeywordSpacing } from '@/lib/utils/keyword-normalization'

type KeywordRow = {
  id: string
  user_id: string
  name: string
  normalized_name: string | null
  created_at: string
}

function toKeywordRecord(row: KeywordRow): KeywordRecord {
  return {
    id: row.id,
    user_id: row.user_id,
    keyword: row.name,
    normalized_keyword: row.normalized_name ?? row.name,
    region: 'GLOBAL',
    search_type: 'WEB',
    trends_data: [],
    searched_at: row.created_at,
    created_at: row.created_at,
    updated_at: row.created_at,
    last_viewed_at: null,
  }
}

export async function getKeywords(
  supabase: SupabaseClient,
  userId: string
): Promise<KeywordRecord[]> {
  const { data, error } = await supabase
    .from('keywords')
    .select('id, user_id, name, normalized_name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(row => toKeywordRecord(row as KeywordRow))
}

export async function getKeyword(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string
): Promise<KeywordRecord | null> {
  const { data, error } = await supabase
    .from('keywords')
    .select('id, user_id, name, normalized_name, created_at')
    .eq('id', keywordId)
    .eq('user_id', userId)
    .single()

  if (error?.code === 'PGRST116') return null
  if (error) throw error

  return toKeywordRecord(data as KeywordRow)
}

export async function upsertKeyword(
  supabase: SupabaseClient,
  userId: string,
  keyword: string
): Promise<KeywordRecord> {
  const normalizedKeyword = normalizeKeywordSpacing(keyword)

  if (!normalizedKeyword) {
    throw new Error('KEYWORD_REQUIRED')
  }

  const { data, error } = await supabase
    .from('keywords')
    .upsert(
      {
        user_id: userId,
        name: normalizedKeyword,
        normalized_name: normalizedKeyword,
      },
      { onConflict: 'user_id,normalized_name' }
    )
    .select('id, user_id, name, normalized_name, created_at')
    .single()

  if (error) throw error

  return toKeywordRecord(data as KeywordRow)
}

export async function updateKeyword(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string,
  keyword: string
): Promise<KeywordRecord | null> {
  const normalizedKeyword = normalizeKeywordSpacing(keyword)

  if (!normalizedKeyword) {
    throw new Error('KEYWORD_REQUIRED')
  }

  const { data, error } = await supabase
    .from('keywords')
    .update({
      name: normalizedKeyword,
      normalized_name: normalizedKeyword,
    })
    .eq('id', keywordId)
    .eq('user_id', userId)
    .select('id, user_id, name, normalized_name, created_at')
    .single()

  if (error?.code === 'PGRST116') return null
  if (error) throw error

  return toKeywordRecord(data as KeywordRow)
}

export async function deleteKeyword(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('keywords')
    .delete()
    .eq('id', keywordId)
    .eq('user_id', userId)
    .select('id')

  if (error) throw error

  return (data ?? []).length > 0
}
