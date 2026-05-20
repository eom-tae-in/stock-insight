import type { SupabaseClient } from '@supabase/supabase-js'
import type { StockSearchRepository } from './repositories/stock-search-repository'
import { SupabaseStockSearchRepository } from './repositories/supabase-stock-search-repository'

export function createStockSearchService(repository: StockSearchRepository) {
  return {
    findById(userId: string, searchId: string) {
      return repository.findById(userId, searchId)
    },

    findManyByUserId(userId: string) {
      return repository.findManyByUserId(userId)
    },

    findSuggestions(query: string, limit: number) {
      return repository.findSuggestions(query, limit)
    },

    deleteById(userId: string, searchId: string) {
      return repository.deleteById(userId, searchId)
    },
  }
}

function createSupabaseStockSearchService(supabase: SupabaseClient) {
  return createStockSearchService(new SupabaseStockSearchRepository(supabase))
}

export function getSavedSearch(
  supabase: SupabaseClient,
  userId: string,
  searchId: string
) {
  return createSupabaseStockSearchService(supabase).findById(userId, searchId)
}

export function getSavedSearches(supabase: SupabaseClient, userId: string) {
  return createSupabaseStockSearchService(supabase).findManyByUserId(userId)
}

export function findSavedStockSuggestions(
  supabase: SupabaseClient,
  query: string,
  limit: number
) {
  return createSupabaseStockSearchService(supabase).findSuggestions(
    query,
    limit
  )
}

export function deleteSavedSearch(
  supabase: SupabaseClient,
  userId: string,
  searchId: string
) {
  return createSupabaseStockSearchService(supabase).deleteById(userId, searchId)
}
