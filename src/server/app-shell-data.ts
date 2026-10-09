import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSavedSearches } from '@/server/stock-search-service'
import { getKeywords } from '@/server/keywords-service'
import { isAdminEmail } from '@/server/admin-auth'
import { createShellData, type AccountProfile } from '@/lib/app-shell'

export const getAppShellData = cache(async () => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (!user || error) redirect('/login')
  const [records, keywords] = await Promise.all([
    getSavedSearches(supabase, user.id),
    getKeywords(supabase, user.id),
  ])
  const candidate: unknown =
    user.user_metadata?.full_name ?? user.user_metadata?.name
  const profile: AccountProfile = {
    name:
      typeof candidate === 'string' && candidate.trim()
        ? candidate
        : (user.email?.split('@')[0] ?? '사용자'),
    email: user.email,
  }
  return {
    records,
    keywords,
    profile,
    shell: createShellData(
      records,
      keywords,
      isAdminEmail(user.email),
      new Date()
    ),
  }
})
