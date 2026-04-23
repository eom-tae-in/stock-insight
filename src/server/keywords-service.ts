import type { SupabaseClient } from '@supabase/supabase-js'
import type { KeywordRecord } from '@/types/database'
import { normalizeKeywordSpacing } from '@/lib/utils/keyword-normalization'

type KeywordRow = {
  id: string
  user_id: string
  name: string
  normalized_name: string | null
  created_at: string
  display_order: number | null
}

type KeywordAnalysisRefreshRow = {
  keyword_id: string
  updated_at: string | null
  created_at: string
}

function toKeywordRecord(
  row: KeywordRow,
  refreshedAt?: string | null
): KeywordRecord {
  const displayDate = refreshedAt ?? row.created_at

  return {
    id: row.id,
    user_id: row.user_id,
    keyword: row.name,
    normalized_keyword: row.normalized_name ?? row.name,
    region: 'GLOBAL',
    search_type: 'WEB',
    trends_data: [],
    searched_at: displayDate,
    created_at: row.created_at,
    updated_at: displayDate,
    display_order: row.display_order ?? 0,
    last_viewed_at: null,
  }
}

export async function getKeywords(
  supabase: SupabaseClient,
  userId: string
): Promise<KeywordRecord[]> {
  const { data, error } = await supabase
    .from('keywords')
    .select('id, user_id, name, normalized_name, created_at, display_order')
    .eq('user_id', userId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as KeywordRow[]
  const keywordIds = rows.map(row => row.id)

  if (keywordIds.length === 0) return []

  const { data: analyses, error: analysesError } = await supabase
    .from('keyword_analysis')
    .select('keyword_id, created_at, updated_at')
    .in('keyword_id', keywordIds)
    .eq('region', 'GLOBAL')
    .eq('period', '5Y')
    .eq('search_type', 'WEB')

  if (analysesError) throw analysesError

  const refreshedAtByKeywordId = new Map(
    ((analyses ?? []) as KeywordAnalysisRefreshRow[]).map(analysis => [
      analysis.keyword_id,
      analysis.updated_at ?? analysis.created_at,
    ])
  )

  return rows.map(row =>
    toKeywordRecord(row, refreshedAtByKeywordId.get(row.id))
  )
}

export async function getKeyword(
  supabase: SupabaseClient,
  userId: string,
  keywordId: string
): Promise<KeywordRecord | null> {
  const { data, error } = await supabase
    .from('keywords')
    .select('id, user_id, name, normalized_name, created_at, display_order')
    .eq('id', keywordId)
    .eq('user_id', userId)
    .single()

  if (error?.code === 'PGRST116') return null
  if (error) throw error

  const { data: analysis, error: analysisError } = await supabase
    .from('keyword_analysis')
    .select('created_at, updated_at')
    .eq('keyword_id', keywordId)
    .eq('region', 'GLOBAL')
    .eq('period', '5Y')
    .eq('search_type', 'WEB')
    .maybeSingle()

  if (analysisError) throw analysisError

  return toKeywordRecord(
    data as KeywordRow,
    analysis?.updated_at ?? analysis?.created_at
  )
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

  const { data: existing, error: existingError } = await supabase
    .from('keywords')
    .select('id, user_id, name, normalized_name, created_at, display_order')
    .eq('user_id', userId)
    .eq('normalized_name', normalizedKeyword)
    .single()

  if (existingError && existingError.code !== 'PGRST116') throw existingError
  if (existing) return toKeywordRecord(existing as KeywordRow)

  const { data: orderRows, error: orderError } = await supabase
    .from('keywords')
    .select('display_order')
    .eq('user_id', userId)
    .order('display_order', { ascending: false })
    .limit(1)

  if (orderError) throw orderError

  const nextDisplayOrder =
    orderRows && orderRows.length > 0
      ? Number(orderRows[0].display_order ?? 0) + 1
      : 1

  const { data, error } = await supabase
    .from('keywords')
    .insert({
      user_id: userId,
      name: normalizedKeyword,
      normalized_name: normalizedKeyword,
      display_order: nextDisplayOrder,
    })
    .select('id, user_id, name, normalized_name, created_at, display_order')
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
    .select('id, user_id, name, normalized_name, created_at, display_order')
    .single()

  if (error?.code === 'PGRST116') return null
  if (error) throw error

  return toKeywordRecord(data as KeywordRow)
}

export async function reorderKeywords(
  supabase: SupabaseClient,
  userId: string,
  orderedIds: string[]
): Promise<void> {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new Error('INVALID_ORDER')
  }

  const uniqueIds = Array.from(new Set(orderedIds))
  if (uniqueIds.length !== orderedIds.length) {
    throw new Error('DUPLICATE_KEYWORD_ID')
  }

  const { data: ownedKeywords, error: ownedError } = await supabase
    .from('keywords')
    .select('id')
    .eq('user_id', userId)
    .in('id', orderedIds)

  if (ownedError) throw ownedError
  if ((ownedKeywords ?? []).length !== orderedIds.length) {
    throw new Error('KEYWORD_OWNERSHIP_MISMATCH')
  }

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('keywords')
      .update({ display_order: index + 1 })
      .eq('id', id)
      .eq('user_id', userId)
  )

  const results = await Promise.all(updates)
  const failed = results.find(result => result.error)
  if (failed?.error) throw failed.error
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
